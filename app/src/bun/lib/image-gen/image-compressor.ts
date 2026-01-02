// =============================================================================
// IMAGE COMPRESSOR
// =============================================================================
// Handles image compression pipeline for API payload limits.
// Uses iterative quality reduction with emergency resize fallback.

import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import type {
  CompressionSettings,
  CompressionResult,
  PayloadConstraints,
  BudgetCalculation,
  BudgetWarning,
} from '../../../mainview/types/image-gen';
import { getThumbnailPath } from '../paths';

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_COMPRESSION: CompressionSettings = {
  maxDimension: 1440,
  emergencyDimensionFactor: 0.8,
  initialQuality: 87,
  minQuality: 50,
  qualityStep: 10,
  maxAttempts: 5,
  autoCompress: true,
  warnOnHeavyCompression: true,
  heavyCompressionThreshold: 60,
  showCompressionDetails: true,
};

const DEFAULT_PAYLOAD: PayloadConstraints = {
  maxPayloadBytes: 4 * 1024 * 1024,
  maxReferenceImages: 10,
  promptReserveBytes: 50 * 1024,
  metadataReserveBytes: 20 * 1024,
  safetyMarginPercent: 10,
  minPerImageBytes: 100 * 1024,
  maxPerImageBytes: 800 * 1024,
};

// -----------------------------------------------------------------------------
// BUDGET CALCULATION
// -----------------------------------------------------------------------------

/**
 * Calculate per-image budget based on constraints and selection count.
 */
export function calculatePerImageBudget(
  selectedCount: number,
  constraints: PayloadConstraints = DEFAULT_PAYLOAD
): number {
  const reserved = constraints.promptReserveBytes + constraints.metadataReserveBytes;
  const available = constraints.maxPayloadBytes - reserved;
  const effectiveBudget = Math.floor(available * (1 - constraints.safetyMarginPercent / 100));

  const perImage = selectedCount > 0
    ? Math.floor(effectiveBudget / selectedCount)
    : constraints.maxPerImageBytes;

  return Math.max(
    constraints.minPerImageBytes,
    Math.min(constraints.maxPerImageBytes, perImage)
  );
}

/**
 * Calculate full budget with warnings.
 */
export function calculateBudget(
  constraints: PayloadConstraints,
  selectedCount: number
): BudgetCalculation {
  const reserved = constraints.promptReserveBytes + constraints.metadataReserveBytes;
  const available = constraints.maxPayloadBytes - reserved;
  const effectiveBudget = Math.floor(available * (1 - constraints.safetyMarginPercent / 100));

  const perImage = selectedCount > 0
    ? Math.floor(effectiveBudget / selectedCount)
    : constraints.maxPerImageBytes;

  const clampedPerImage = Math.max(
    constraints.minPerImageBytes,
    Math.min(constraints.maxPerImageBytes, perImage)
  );

  const warnings: BudgetWarning[] = [];

  if (clampedPerImage < 150 * 1024) {
    warnings.push({
      level: 'warning',
      message: `Per-image budget (${formatBytes(clampedPerImage)}) is low. Expect visible compression.`,
    });
  }

  if (clampedPerImage <= constraints.minPerImageBytes && selectedCount < constraints.maxReferenceImages) {
    warnings.push({
      level: 'info',
      message: `At minimum per-image budget. Adding more images won't reduce quality further.`,
    });
  }

  return {
    constraints,
    selectedImageCount: selectedCount,
    effectiveImageBudget: effectiveBudget,
    perImageBudget: clampedPerImage,
    canAddMore: selectedCount < constraints.maxReferenceImages,
    remainingSlots: constraints.maxReferenceImages - selectedCount,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// COMPRESSION
// -----------------------------------------------------------------------------

/**
 * Compress an image to fit within the target budget.
 * Uses iterative quality reduction, then emergency resize if needed.
 */
export async function compressImage(
  imagePath: string,
  targetBytes: number,
  settings: CompressionSettings = DEFAULT_COMPRESSION
): Promise<CompressionResult> {
  // Load original image
  const originalBuffer = await readFile(imagePath);
  const originalSize = originalBuffer.length;

  // Get original dimensions
  const metadata = await sharp(originalBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Step 1: Resize to max dimension if needed
  let buffer = originalBuffer;
  let currentWidth = originalWidth;
  let currentHeight = originalHeight;

  if (originalWidth > settings.maxDimension || originalHeight > settings.maxDimension) {
    const resized = await resizeToDimension(buffer, settings.maxDimension);
    buffer = resized.buffer;
    currentWidth = resized.width;
    currentHeight = resized.height;
  }

  // Step 2: Iterative quality reduction
  let quality = settings.initialQuality;
  let result = await compressToJpeg(buffer, quality);
  let attempts = 0;

  while (result.length > targetBytes && quality > settings.minQuality && attempts < settings.maxAttempts) {
    quality -= settings.qualityStep;
    quality = Math.max(quality, settings.minQuality);
    result = await compressToJpeg(buffer, quality);
    attempts++;
  }

  // Step 3: Emergency resize if still too large
  if (result.length > targetBytes) {
    const newMaxDimension = Math.floor(
      Math.max(currentWidth, currentHeight) * settings.emergencyDimensionFactor
    );

    const resized = await resizeToDimension(buffer, newMaxDimension);
    buffer = resized.buffer;
    currentWidth = resized.width;
    currentHeight = resized.height;

    // Re-compress at minimum quality
    result = await compressToJpeg(buffer, settings.minQuality);
    quality = settings.minQuality;
  }

  // Convert to base64
  const base64 = result.toString('base64');

  return {
    base64,
    originalSize,
    compressedSize: result.length,
    originalDimensions: { width: originalWidth, height: originalHeight },
    finalDimensions: { width: currentWidth, height: currentHeight },
    finalQuality: quality,
    compressionRatio: originalSize / result.length,
  };
}

/**
 * Compress a buffer (already in memory) to target size.
 */
export async function compressBuffer(
  buffer: Buffer,
  targetBytes: number,
  settings: CompressionSettings = DEFAULT_COMPRESSION
): Promise<CompressionResult> {
  const originalSize = buffer.length;

  // Get original dimensions
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  let workingBuffer = buffer;
  let currentWidth = originalWidth;
  let currentHeight = originalHeight;

  // Step 1: Resize to max dimension if needed
  if (originalWidth > settings.maxDimension || originalHeight > settings.maxDimension) {
    const resized = await resizeToDimension(buffer, settings.maxDimension);
    workingBuffer = resized.buffer;
    currentWidth = resized.width;
    currentHeight = resized.height;
  }

  // Step 2: Iterative quality reduction
  let quality = settings.initialQuality;
  let result = await compressToJpeg(workingBuffer, quality);
  let attempts = 0;

  while (result.length > targetBytes && quality > settings.minQuality && attempts < settings.maxAttempts) {
    quality -= settings.qualityStep;
    quality = Math.max(quality, settings.minQuality);
    result = await compressToJpeg(workingBuffer, quality);
    attempts++;
  }

  // Step 3: Emergency resize if still too large
  if (result.length > targetBytes) {
    const newMaxDimension = Math.floor(
      Math.max(currentWidth, currentHeight) * settings.emergencyDimensionFactor
    );

    const resized = await resizeToDimension(workingBuffer, newMaxDimension);
    workingBuffer = resized.buffer;
    currentWidth = resized.width;
    currentHeight = resized.height;

    result = await compressToJpeg(workingBuffer, settings.minQuality);
    quality = settings.minQuality;
  }

  const base64 = result.toString('base64');

  return {
    base64,
    originalSize,
    compressedSize: result.length,
    originalDimensions: { width: originalWidth, height: originalHeight },
    finalDimensions: { width: currentWidth, height: currentHeight },
    finalQuality: quality,
    compressionRatio: originalSize / result.length,
  };
}

// -----------------------------------------------------------------------------
// THUMBNAILS
// -----------------------------------------------------------------------------

/**
 * Generate a thumbnail for UI display.
 */
export async function generateThumbnail(
  imagePath: string,
  size: number = 256
): Promise<{ base64: string; hash: string }> {
  const buffer = await readFile(imagePath);
  const hash = createHash('md5').update(buffer).digest('hex');

  const thumbnail = await sharp(buffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    base64: thumbnail.toString('base64'),
    hash,
  };
}

/**
 * Get or create cached thumbnail.
 */
export async function getCachedThumbnail(
  imagePath: string,
  size: number = 256
): Promise<string> {
  const buffer = await readFile(imagePath);
  const hash = createHash('md5').update(buffer).digest('hex');
  const cachePath = getThumbnailPath(hash);

  try {
    // Try to read from cache
    const cached = await readFile(cachePath);
    return cached.toString('base64');
  } catch {
    // Generate and cache
    const thumbnail = await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Write to cache (fire and forget)
    const { writeFile: write, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    await mkdir(dirname(cachePath), { recursive: true });
    write(cachePath, thumbnail).catch(() => {});

    return thumbnail.toString('base64');
  }
}

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

/**
 * Get image dimensions without loading full image.
 */
export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imagePath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Estimate base64 size from file size.
 * Base64 encoding increases size by ~33%.
 */
export function estimateBase64Size(fileSize: number): number {
  return Math.ceil(fileSize * 1.37);
}

/**
 * Format bytes to human readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

async function resizeToDimension(
  buffer: Buffer,
  maxDimension: number
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const resized = sharp(buffer).resize(maxDimension, maxDimension, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  const result = await resized.toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

async function compressToJpeg(buffer: Buffer, quality: number): Promise<Buffer> {
  return sharp(buffer)
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}
