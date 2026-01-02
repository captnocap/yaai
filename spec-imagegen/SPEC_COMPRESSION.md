# Image Compression Pipeline — Specification

> Companion to SPEC.md  
> Handles the 4MB payload limit with 10 reference images up to 14MB each

---

## 1. The Constraint

```
┌─────────────────────────────────────────────────────────────────┐
│                     HARD API LIMIT                              │
│                                                                 │
│   Total request payload: 4 MB maximum                           │
│   Maximum reference images: 10                                  │
│                                                                 │
│   Your source images: 3-14 MB each                              │
│   Worst case: 10 × 14 MB = 140 MB → must fit in 4 MB            │
│                                                                 │
│   Compression ratio needed: up to 35:1                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Budget Calculation

### 2.1 Payload Breakdown

```typescript
const PAYLOAD_BUDGET = {
  total: 4 * 1024 * 1024,              // 4 MB
  
  // Reserve space for non-image data
  promptReserve: 50 * 1024,            // 50 KB for prompt text
  metadataReserve: 20 * 1024,          // 20 KB for JSON structure
  safetyMargin: 0.1,                   // 10% buffer
  
  // Effective image budget
  get imagesBudget() {
    const reserved = this.promptReserve + this.metadataReserve
    const available = this.total - reserved
    return Math.floor(available * (1 - this.safetyMargin))
  }
}

// imagesBudget ≈ 3.5 MB for all images combined
```

### 2.2 Per-Image Budget

```typescript
function calculatePerImageBudget(imageCount: number): number {
  const totalBudget = PAYLOAD_BUDGET.imagesBudget  // ~3.5 MB
  const perImage = Math.floor(totalBudget / imageCount)
  
  // Ensure minimum viable quality
  const MIN_PER_IMAGE = 100 * 1024     // 100 KB floor
  const MAX_PER_IMAGE = 800 * 1024     // 800 KB ceiling (single image)
  
  return Math.max(MIN_PER_IMAGE, Math.min(MAX_PER_IMAGE, perImage))
}

// Examples:
// 1 image  → 800 KB budget (capped)
// 2 images → 800 KB each (capped)
// 5 images → 700 KB each
// 10 images → 350 KB each
```

---

## 3. Compression Pipeline

### 3.1 Pipeline Stages

```
Source Image (14 MB, 6000×4000)
         │
         ▼
┌─────────────────────────────────────┐
│ STAGE 1: Dimension Reduction        │
│                                     │
│ If width OR height > MAX_DIMENSION: │
│   Resize to fit within MAX_DIMENSION│
│   Preserve aspect ratio             │
│                                     │
│ MAX_DIMENSION = 1440px (default)    │
│                                     │
│ 6000×4000 → 1440×960                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ STAGE 2: Initial JPEG Encode        │
│                                     │
│ Convert to JPEG                     │
│ Quality: INITIAL_QUALITY (87)       │
│                                     │
│ Check size against budget           │
└─────────────────────────────────────┘
         │
         ▼
    Size OK? ───Yes──→ Done ✓
         │
         No
         │
         ▼
┌─────────────────────────────────────┐
│ STAGE 3: Iterative Quality Reduction│
│                                     │
│ Loop:                               │
│   quality -= QUALITY_STEP (10)      │
│   Re-encode JPEG                    │
│   Check size                        │
│                                     │
│ Until:                              │
│   size <= budget                    │
│   OR quality <= MIN_QUALITY (50)    │
│   OR attempts >= MAX_ATTEMPTS (5)   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ STAGE 4: Emergency Dimension Cut    │
│ (only if still over budget)         │
│                                     │
│ Reduce MAX_DIMENSION by 20%         │
│ Re-run from Stage 1                 │
│                                     │
│ 1440 → 1152 → 922 → ...             │
└─────────────────────────────────────┘
         │
         ▼
    Final base64 output
```

### 3.2 Implementation

```typescript
interface CompressionConfig {
  maxDimension: number           // 1440
  initialQuality: number         // 87
  minQuality: number             // 50
  qualityStep: number            // 10
  maxAttempts: number            // 5
  emergencyDimensionFactor: number  // 0.8
}

const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  maxDimension: 1440,
  initialQuality: 87,
  minQuality: 50,
  qualityStep: 10,
  maxAttempts: 5,
  emergencyDimensionFactor: 0.8
}

interface CompressionResult {
  base64: string
  originalSize: number
  compressedSize: number
  originalDimensions: { width: number, height: number }
  finalDimensions: { width: number, height: number }
  finalQuality: number
  compressionRatio: number
  stages: CompressionStage[]      // for debugging/display
}

interface CompressionStage {
  stage: string
  inputSize: number
  outputSize: number
  dimensions: { width: number, height: number }
  quality: number
  duration: number
}

async function compressImage(
  inputPath: string,
  targetBytes: number,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): Promise<CompressionResult> {
  const stages: CompressionStage[] = []
  const startTime = Date.now()
  
  // Read original
  const originalBuffer = await fs.readFile(inputPath)
  const originalSize = originalBuffer.length
  const metadata = await sharp(originalBuffer).metadata()
  const originalDimensions = { 
    width: metadata.width!, 
    height: metadata.height! 
  }
  
  let currentBuffer = originalBuffer
  let currentDimensions = { ...originalDimensions }
  let currentQuality = config.initialQuality
  let maxDim = config.maxDimension
  
  // Stage 1: Dimension reduction
  if (currentDimensions.width > maxDim || currentDimensions.height > maxDim) {
    const stageStart = Date.now()
    
    currentBuffer = await sharp(currentBuffer)
      .resize(maxDim, maxDim, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer()
    
    const resizedMeta = await sharp(currentBuffer).metadata()
    currentDimensions = { 
      width: resizedMeta.width!, 
      height: resizedMeta.height! 
    }
    
    stages.push({
      stage: 'dimension_reduction',
      inputSize: originalSize,
      outputSize: currentBuffer.length,
      dimensions: currentDimensions,
      quality: 100,
      duration: Date.now() - stageStart
    })
  }
  
  // Stage 2 & 3: JPEG encoding with quality iteration
  let attempts = 0
  let finalBuffer: Buffer
  
  while (attempts < config.maxAttempts) {
    const stageStart = Date.now()
    
    finalBuffer = await sharp(currentBuffer)
      .jpeg({ quality: currentQuality })
      .toBuffer()
    
    const base64 = finalBuffer.toString('base64')
    const estimatedSize = Math.ceil(base64.length * 0.75)  // base64 overhead
    
    stages.push({
      stage: `jpeg_encode_q${currentQuality}`,
      inputSize: currentBuffer.length,
      outputSize: estimatedSize,
      dimensions: currentDimensions,
      quality: currentQuality,
      duration: Date.now() - stageStart
    })
    
    if (estimatedSize <= targetBytes) {
      // Success!
      return {
        base64,
        originalSize,
        compressedSize: estimatedSize,
        originalDimensions,
        finalDimensions: currentDimensions,
        finalQuality: currentQuality,
        compressionRatio: originalSize / estimatedSize,
        stages
      }
    }
    
    // Reduce quality and retry
    currentQuality -= config.qualityStep
    attempts++
    
    if (currentQuality < config.minQuality) {
      break
    }
  }
  
  // Stage 4: Emergency dimension reduction
  maxDim = Math.floor(maxDim * config.emergencyDimensionFactor)
  
  // Recursive call with smaller dimensions
  // (In practice, implement iteratively to avoid stack issues)
  return compressImage(inputPath, targetBytes, {
    ...config,
    maxDimension: maxDim
  })
}
```

---

## 4. Batch Compression

### 4.1 Processing Multiple Images

```typescript
interface BatchCompressionResult {
  images: CompressionResult[]
  totalOriginalSize: number
  totalCompressedSize: number
  totalCompressionRatio: number
  payloadSize: number               // final JSON payload size
  withinBudget: boolean
  warnings: string[]
}

async function compressImageBatch(
  paths: string[],
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): Promise<BatchCompressionResult> {
  const warnings: string[] = []
  
  // Validate count
  if (paths.length > 10) {
    throw new Error(`Maximum 10 reference images allowed, got ${paths.length}`)
  }
  
  // Calculate per-image budget
  const perImageBudget = calculatePerImageBudget(paths.length)
  
  // Compress all images
  const results: CompressionResult[] = []
  let totalOriginal = 0
  let totalCompressed = 0
  
  for (const imagePath of paths) {
    try {
      const result = await compressImage(imagePath, perImageBudget, config)
      results.push(result)
      totalOriginal += result.originalSize
      totalCompressed += result.compressedSize
      
      // Warn if aggressive compression was needed
      if (result.finalQuality <= 60) {
        warnings.push(
          `${path.basename(imagePath)}: Heavy compression (q${result.finalQuality}), ` +
          `quality may be degraded`
        )
      }
      
      if (result.compressionRatio > 20) {
        warnings.push(
          `${path.basename(imagePath)}: Extreme compression (${result.compressionRatio.toFixed(1)}:1)`
        )
      }
    } catch (error) {
      warnings.push(`${path.basename(imagePath)}: Failed to compress - ${error.message}`)
      // Continue with other images
    }
  }
  
  // Calculate final payload size
  const payloadSize = estimatePayloadSize(results)
  const withinBudget = payloadSize <= PAYLOAD_BUDGET.total
  
  if (!withinBudget) {
    warnings.push(
      `Total payload (${formatBytes(payloadSize)}) exceeds limit ` +
      `(${formatBytes(PAYLOAD_BUDGET.total)}). Some images may be dropped.`
    )
  }
  
  return {
    images: results,
    totalOriginalSize: totalOriginal,
    totalCompressedSize: totalCompressed,
    totalCompressionRatio: totalOriginal / totalCompressed,
    payloadSize,
    withinBudget,
    warnings
  }
}
```

---

## 5. UI Feedback

### 5.1 Selection Array with Compression Info

```
┌─ Selection Array ──────────────────────────────────────────────────────────────┐
│                                                                                │
│  Budget: 350 KB/image (10 selected)              Total: 2.8 MB / 3.5 MB ████░ │
│                                                                                │
│  ┌─ [0] ──────────┐ ┌─ [1] ──────────┐ ┌─ [2] ──────────┐                     │
│  │                │ │                │ │                │                     │
│  │     thumb      │ │     thumb      │ │     thumb      │                     │
│  │                │ │                │ │                │                     │
│  ├────────────────┤ ├────────────────┤ ├────────────────┤                     │
│  │ portrait01.jpg │ │ landscape.png  │ │ reference3.jpg │                     │
│  │ 12 MB → 340 KB │ │ 8 MB → 320 KB  │ │ 3 MB → 290 KB  │                     │
│  │ q67 · 1440×960 │ │ q72 · 1440×810 │ │ q87 · 1200×800 │                     │
│  │ ████████████░░ │ │ ████████████░░ │ │ █████████░░░░░ │                     │
│  └────────────────┘ └────────────────┘ └────────────────┘                     │
│                                                                                │
│  ⚠ portrait01.jpg: Heavy compression needed, some detail loss possible        │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Compression Badge Component

```typescript
interface CompressionBadgeProps {
  original: number          // bytes
  compressed: number        // bytes
  quality: number
  dimensions: { width: number, height: number }
}

// Visual states based on compression severity
type CompressionSeverity = 'light' | 'moderate' | 'heavy' | 'extreme'

function getCompressionSeverity(ratio: number, quality: number): CompressionSeverity {
  if (quality >= 80 && ratio < 5) return 'light'
  if (quality >= 65 && ratio < 15) return 'moderate'
  if (quality >= 50 && ratio < 30) return 'heavy'
  return 'extreme'
}

// Colors
const SEVERITY_COLORS = {
  light: 'green',       // barely noticeable
  moderate: 'yellow',   // acceptable
  heavy: 'orange',      // visible degradation
  extreme: 'red'        // significant quality loss
}
```

### 5.3 Real-Time Budget Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ Payload Budget                                                  │
│                                                                 │
│ ████████████████████████████████████░░░░░░░░░░░░  2.8 / 3.5 MB │
│ ├─ img1 ─┤├─ img2 ─┤├─ img3 ─┤├── remaining ──┤                │
│                                                                 │
│ Per-image: 350 KB    Images: 8/10    Headroom: 700 KB          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Warning Toast Examples

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠ Heavy Compression Required                                   │
│                                                                 │
│ "portrait_highres.jpg" (14 MB) compressed to 340 KB            │
│ Quality reduced to 52%. Some detail loss is likely.            │
│                                                                 │
│ Consider using a smaller source image for better results.      │
│                                                    [Dismiss]   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔴 Payload Limit Exceeded                                       │
│                                                                 │
│ Total: 4.2 MB (limit: 4 MB)                                    │
│ Remove 1-2 images or they will be auto-dropped.                │
│                                                                 │
│                              [Remove Last] [Auto-Optimize]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Compression Settings (User Adjustable)

```typescript
interface UserCompressionSettings {
  // Dimension limit
  maxDimension: number              // 1440 default, range: 800-2048
  
  // Quality floor
  minQuality: number                // 50 default, range: 30-80
  
  // Starting quality
  initialQuality: number            // 87 default, range: 60-95
  
  // Behavior
  autoCompress: boolean             // true = compress on add
  warnOnHeavyCompression: boolean   // true = show warnings
  showCompressionDetails: boolean   // true = show per-image stats
}
```

### Settings UI Section

```
┌─ Compression Settings ──────────────────────────────────────────┐
│                                                                 │
│ Maximum Dimension        [1440] px                              │
│ Larger images resized to fit within this                        │
│                                                                 │
│ Initial Quality          [87]                                   │
│ Starting JPEG quality (higher = larger files)                   │
│                                                                 │
│ Minimum Quality          [50]                                   │
│ Won't compress below this (lower = more artifacts)              │
│                                                                 │
│ ☑ Auto-compress on selection                                   │
│ ☑ Warn when heavy compression needed                           │
│ ☑ Show compression details in selection                        │
│                                                                 │
│ Presets: [Conservative ▼]                                       │
│          • Conservative: 2048px, q90-70 (larger files)          │
│          • Balanced: 1440px, q87-50 (default)                   │
│          • Aggressive: 1024px, q80-40 (smaller files)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Edge Cases

### 7.1 Image Too Large Even After Max Compression

```typescript
if (result.compressedSize > targetBytes && quality <= minQuality) {
  // Options:
  // 1. Further reduce dimensions (emergency mode)
  // 2. Warn user and suggest removing image
  // 3. Auto-drop from selection with notification
  
  // Preference: Warn first, auto-drop only if user proceeds
}
```

### 7.2 Payload Overflow at Request Time

```typescript
async function preparePayload(images: CompressedImage[]): Promise<PreparedPayload> {
  let totalSize = 0
  const included: CompressedImage[] = []
  const dropped: CompressedImage[] = []
  
  for (const image of images) {
    const newTotal = totalSize + image.compressedSize
    
    if (newTotal <= PAYLOAD_BUDGET.imagesBudget) {
      included.push(image)
      totalSize = newTotal
    } else {
      dropped.push(image)
    }
  }
  
  if (dropped.length > 0) {
    // Emit warning event
    emit('payload:overflow', {
      included: included.length,
      dropped: dropped.map(d => d.filename),
      reason: 'Exceeded 4MB payload limit'
    })
  }
  
  return { images: included, droppedCount: dropped.length }
}
```

### 7.3 Animated GIF / WebP

```typescript
// Strip animation, use first frame only
async function handleAnimatedImage(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  
  if (metadata.pages && metadata.pages > 1) {
    // Animated - extract first frame
    return sharp(buffer, { page: 0 })
      .toBuffer()
  }
  
  return buffer
}
```

### 7.4 HEIC/HEIF (iPhone photos)

```typescript
// Sharp supports HEIC with libvips
// Just ensure it's converted to JPEG in pipeline
async function normalizeFormat(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  
  // Force JPEG output regardless of input format
  // This handles HEIC, WebP, PNG, TIFF, etc.
  return sharp(buffer)
    .jpeg()  // convert to JPEG
    .toBuffer()
}
```

---

## 8. Performance Optimization

### 8.1 Parallel Compression

```typescript
// Compress multiple images in parallel (bounded concurrency)
async function compressBatchParallel(
  paths: string[],
  perImageBudget: number,
  concurrency: number = 4
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = new Array(paths.length)
  let index = 0
  
  async function worker() {
    while (index < paths.length) {
      const currentIndex = index++
      results[currentIndex] = await compressImage(
        paths[currentIndex],
        perImageBudget
      )
    }
  }
  
  // Run N workers in parallel
  await Promise.all(
    Array.from({ length: concurrency }, () => worker())
  )
  
  return results
}
```

### 8.2 Progressive Loading in UI

```typescript
// Don't block UI while compressing
// Show results as they complete

function useProgressiveCompression(paths: string[]) {
  const [results, setResults] = useState<Map<string, CompressionResult>>(new Map())
  const [pending, setPending] = useState<Set<string>>(new Set(paths))
  
  useEffect(() => {
    paths.forEach(async (p) => {
      const result = await sendMessage('compress-image', { path: p, budget })
      
      setResults(prev => new Map(prev).set(p, result))
      setPending(prev => {
        const next = new Set(prev)
        next.delete(p)
        return next
      })
    })
  }, [paths])
  
  return { results, pending, progress: 1 - (pending.size / paths.length) }
}
```

---

## 9. Debugging & Logging

### 9.1 Compression Log Entry

```typescript
interface CompressionLogEntry {
  timestamp: number
  filename: string
  originalSize: number
  compressedSize: number
  ratio: number
  stages: {
    name: string
    size: number
    quality: number
    dimensions: string
    duration: number
  }[]
  warnings: string[]
  success: boolean
}

// Log format (for debugging)
// [2025-01-02 10:30:45] COMPRESS portrait.jpg
//   Original: 14.2 MB (6000×4000)
//   Stage 1: resize → 1440×960 (2.1 MB)
//   Stage 2: jpeg q87 → 890 KB
//   Stage 3: jpeg q77 → 520 KB
//   Stage 4: jpeg q67 → 340 KB ✓
//   Final: 340 KB (41.8:1 ratio, q67)
//   Duration: 287ms
```

---

## 10. Integration Points

### 10.1 Reference Picker → Compression

```typescript
// When image is added to selection
async function onImageSelected(imagePath: string) {
  // 1. Add to selection immediately (with loading state)
  addToSelection({
    path: imagePath,
    status: 'compressing',
    thumbnail: null,
    compressed: null
  })
  
  // 2. Calculate current budget
  const budget = calculatePerImageBudget(selection.length)
  
  // 3. Compress in background
  const result = await sendMessage('compress-image', { path: imagePath, budget })
  
  // 4. Update selection with result
  updateSelection(imagePath, {
    status: 'ready',
    thumbnail: result.base64,  // use compressed as thumbnail too
    compressed: result
  })
  
  // 5. Show warnings if needed
  if (result.finalQuality < 60) {
    showWarning(`Heavy compression on ${basename(imagePath)}`)
  }
}
```

### 10.2 Job Execution → Pre-compressed Data

```typescript
// At batch execution time, images are already compressed
// Just need to verify total size fits

async function prepareBatchPayload(job: Job): Promise<PayloadData> {
  const compressedImages = job.resolvedReferences
    .map(ref => ref.compressed)
    .filter(Boolean)
  
  // Final size check
  const totalSize = compressedImages.reduce((sum, img) => sum + img.compressedSize, 0)
  
  if (totalSize > PAYLOAD_BUDGET.imagesBudget) {
    // Shouldn't happen if UI is working correctly
    // But handle gracefully - drop excess
    const trimmed = trimToFit(compressedImages, PAYLOAD_BUDGET.imagesBudget)
    logger.warn(`Dropped ${compressedImages.length - trimmed.length} images to fit payload`)
    return { images: trimmed }
  }
  
  return { images: compressedImages }
}
```

---

*End of Compression Pipeline specification.*
