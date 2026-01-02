// =============================================================================
// IMAGE GEN STORE
// =============================================================================
// Main store for image generation feature.
// Orchestrates queue, jobs, and dispatcher. Provides WebSocket interface.

import { EventEmitter } from 'events';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type {
  QueueEntry,
  QueueGroup,
  QueueFile,
  Job,
  JobState,
  ImageGenSettings,
  ImageGenEvent,
  ImageGenEventType,
  PipelineState,
  QuickGenerateRequest,
  QuickGenerateResult,
  GeneratedImage,
  GalleryFilters,
  PromptFile,
} from '../../../mainview/types/image-gen';
import {
  IMAGE_GEN_QUEUE_FILE,
  IMAGE_GEN_PROMPTS_DIR,
  IMAGE_GEN_REFERENCES_DIR,
  IMAGE_GEN_OUTPUTS_DIR,
  ensureImageGenDirs,
} from '../paths';
import { getDispatcher, RequestDispatcher } from './request-dispatcher';
import { getRateLimiter } from './rate-limiter';
import { getConcurrencyLimiter } from './concurrency-limiter';
import { getAPIClient } from './api-client';
import { listPrompts, loadPrompt, savePrompt, deletePrompt, renamePrompt } from './prompt-processor';
import { getRoots, getFolderContents, getFolderStats } from './reference-resolver';
import { calculateBudget, calculatePerImageBudget, compressImage } from './image-compressor';

// -----------------------------------------------------------------------------
// STORE
// -----------------------------------------------------------------------------

export class ImageGenStore extends EventEmitter {
  private initialized: boolean = false;
  private settings: ImageGenSettings | null = null;

  // Queue state
  private groups: Map<string, QueueGroup> = new Map();
  private groupOrder: string[] = [];
  private entries: Map<string, QueueEntry> = new Map();

  // Job state
  private jobs: Map<string, Job> = new Map();
  private jobHistory: Job[] = [];

  // Dispatcher reference
  private dispatcher: RequestDispatcher | null = null;

  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(settings: ImageGenSettings): Promise<void> {
    if (this.initialized) return;

    this.settings = settings;

    // Ensure directories exist
    await ensureImageGenDirs();

    // Load persisted queue
    await this.loadQueue();

    // Initialize services
    this.initializeServices();

    this.initialized = true;
    this.emitEvent('pipeline-started', { running: false });
  }

  private initializeServices(): void {
    if (!this.settings) return;

    // Configure rate limiter
    getRateLimiter(this.settings.rateLimit);

    // Configure concurrency limiter
    getConcurrencyLimiter(this.settings.concurrency);

    // Configure API client
    getAPIClient(this.settings.apiUrl, this.settings.apiKey);

    // Configure dispatcher
    this.dispatcher = getDispatcher(this.settings.failurePolicy);
    this.dispatcher.configure({
      failurePolicy: this.settings.failurePolicy,
      models: this.settings.models,
      promptsDir: this.settings.promptsDir || IMAGE_GEN_PROMPTS_DIR,
      outputDir: this.settings.outputDir || IMAGE_GEN_OUTPUTS_DIR,
      referencesDir: this.settings.referencesDir || IMAGE_GEN_REFERENCES_DIR,
      perImageBudget: calculatePerImageBudget(
        this.settings.payload.maxReferenceImages,
        this.settings.payload
      ),
    });

    // Wire up dispatcher events
    this.wireDispatcherEvents();
  }

  private wireDispatcherEvents(): void {
    if (!this.dispatcher) return;

    this.dispatcher.on('job-created', (job: Job) => {
      this.jobs.set(job.id, job);
      this.emitEvent('job-created', { jobId: job.id, job });
    });

    this.dispatcher.on('job-started', (job: Job) => {
      this.emitEvent('job-started', { jobId: job.id, job });
    });

    this.dispatcher.on('job-paused', (job: Job) => {
      this.emitEvent('job-paused', { jobId: job.id, job });
    });

    this.dispatcher.on('job-resumed', (job: Job) => {
      this.emitEvent('job-resumed', { jobId: job.id, job });
    });

    this.dispatcher.on('job-completed', (job: Job) => {
      this.jobHistory.unshift(job);
      if (this.jobHistory.length > 100) {
        this.jobHistory.pop();
      }
      this.emitEvent('job-completed', { jobId: job.id, job });
    });

    this.dispatcher.on('job-failed', ({ job, error }) => {
      this.emitEvent('job-failed', { jobId: job.id, job, error });
    });

    this.dispatcher.on('job-cancelled', (job: Job) => {
      this.emitEvent('job-cancelled', { jobId: job.id, job });
    });

    this.dispatcher.on('job-auto-paused', ({ job, error }) => {
      this.emitEvent('auto-paused', { jobId: job.id, job, error });
    });

    this.dispatcher.on('batch-started', (data) => {
      this.emitEvent('batch-started', data);
    });

    this.dispatcher.on('batch-completed', (data) => {
      this.emitEvent('batch-completed', data);
    });

    this.dispatcher.on('batch-failed', (data) => {
      this.emitEvent('batch-failed', data);
    });

    this.dispatcher.on('rate-limited', (data) => {
      this.emitEvent('rate-limited', data);
    });

    this.dispatcher.on('started', () => {
      this.emitEvent('pipeline-started', { running: true });
    });

    this.dispatcher.on('stopped', () => {
      this.emitEvent('pipeline-stopped', { running: false });
    });
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  updateSettings(settings: Partial<ImageGenSettings>): void {
    if (!this.settings) return;

    this.settings = { ...this.settings, ...settings };

    // Re-configure services
    if (settings.rateLimit) {
      getRateLimiter().updateConfig(settings.rateLimit);
    }
    if (settings.concurrency) {
      getConcurrencyLimiter().updateConfig(settings.concurrency);
    }
    if (settings.apiUrl || settings.apiKey) {
      getAPIClient().configure({
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey,
      });
    }
    if (this.dispatcher && settings.failurePolicy) {
      this.dispatcher.configure({ failurePolicy: settings.failurePolicy });
    }
  }

  getSettings(): ImageGenSettings | null {
    return this.settings;
  }

  // ---------------------------------------------------------------------------
  // QUEUE OPERATIONS
  // ---------------------------------------------------------------------------

  // Groups

  createGroup(name: string): QueueGroup {
    const group: QueueGroup = {
      id: crypto.randomUUID(),
      name,
      collapsed: false,
      sortOrder: this.groupOrder.length,
      entries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.groups.set(group.id, group);
    this.groupOrder.push(group.id);

    this.saveQueue();
    this.emitQueueUpdate();

    return group;
  }

  updateGroup(id: string, updates: Partial<QueueGroup>): QueueGroup | null {
    const group = this.groups.get(id);
    if (!group) return null;

    Object.assign(group, updates, { updatedAt: Date.now() });

    this.saveQueue();
    this.emitQueueUpdate();

    return group;
  }

  deleteGroup(id: string): void {
    const group = this.groups.get(id);
    if (!group) return;

    // Delete all entries in group
    for (const entryId of group.entries) {
      this.entries.delete(entryId);
    }

    this.groups.delete(id);
    this.groupOrder = this.groupOrder.filter(gid => gid !== id);

    this.saveQueue();
    this.emitQueueUpdate();
  }

  reorderGroups(orderedIds: string[]): void {
    this.groupOrder = orderedIds.filter(id => this.groups.has(id));

    // Update sort orders
    this.groupOrder.forEach((id, index) => {
      const group = this.groups.get(id);
      if (group) {
        group.sortOrder = index;
        group.updatedAt = Date.now();
      }
    });

    this.saveQueue();
    this.emitQueueUpdate();
  }

  getGroup(id: string): QueueGroup | null {
    return this.groups.get(id) || null;
  }

  getAllGroups(): QueueGroup[] {
    return this.groupOrder.map(id => this.groups.get(id)!).filter(Boolean);
  }

  // Entries

  createEntry(groupId: string, data: Partial<QueueEntry>): QueueEntry | null {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const entry: QueueEntry = {
      id: crypto.randomUUID(),
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      prompt: data.prompt || { type: 'inline', value: '' },
      resolution: data.resolution || { type: 'dimensions', width: 4096, height: 4096 },
      imagesPerBatch: data.imagesPerBatch || this.settings?.defaultImagesPerBatch || 1,
      batchCount: data.batchCount || this.settings?.defaultBatchCount || 25,
      model: data.model || this.settings?.defaultModel || 'seedream-v4',
      style: data.style || null,
      references: data.references || [],
      extParams: data.extParams || {},
      executionMode: data.executionMode || this.settings?.defaultExecutionMode || 'fixed',
      targetImages: data.targetImages || null,
      tolerance: data.tolerance || this.settings?.defaultTolerance || 3,
    };

    this.entries.set(entry.id, entry);
    group.entries.push(entry.id);
    group.updatedAt = Date.now();

    this.saveQueue();
    this.emitQueueUpdate();

    return entry;
  }

  updateEntry(id: string, updates: Partial<QueueEntry>): QueueEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    Object.assign(entry, updates, { updatedAt: Date.now() });

    this.saveQueue();
    this.emitQueueUpdate();

    return entry;
  }

  deleteEntry(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    // Remove from group
    for (const group of this.groups.values()) {
      const index = group.entries.indexOf(id);
      if (index !== -1) {
        group.entries.splice(index, 1);
        group.updatedAt = Date.now();
        break;
      }
    }

    this.entries.delete(id);

    this.saveQueue();
    this.emitQueueUpdate();
  }

  duplicateEntry(id: string): QueueEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    // Find group
    let groupId: string | null = null;
    for (const group of this.groups.values()) {
      if (group.entries.includes(id)) {
        groupId = group.id;
        break;
      }
    }
    if (!groupId) return null;

    const duplicate: QueueEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.entries.set(duplicate.id, duplicate);

    const group = this.groups.get(groupId)!;
    const index = group.entries.indexOf(id);
    group.entries.splice(index + 1, 0, duplicate.id);
    group.updatedAt = Date.now();

    this.saveQueue();
    this.emitQueueUpdate();

    return duplicate;
  }

  moveEntry(id: string, targetGroupId: string, index: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    const targetGroup = this.groups.get(targetGroupId);
    if (!targetGroup) return;

    // Remove from current group
    for (const group of this.groups.values()) {
      const idx = group.entries.indexOf(id);
      if (idx !== -1) {
        group.entries.splice(idx, 1);
        group.updatedAt = Date.now();
        break;
      }
    }

    // Add to target group
    targetGroup.entries.splice(index, 0, id);
    targetGroup.updatedAt = Date.now();

    this.saveQueue();
    this.emitQueueUpdate();
  }

  reorderEntries(groupId: string, orderedIds: string[]): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.entries = orderedIds.filter(id => this.entries.has(id));
    group.updatedAt = Date.now();

    this.saveQueue();
    this.emitQueueUpdate();
  }

  getEntry(id: string): QueueEntry | null {
    return this.entries.get(id) || null;
  }

  getEnabledEntries(): QueueEntry[] {
    return Array.from(this.entries.values()).filter(e => e.enabled);
  }

  // Bulk operations

  enableEntries(ids: string[]): void {
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (entry) {
        entry.enabled = true;
        entry.updatedAt = Date.now();
      }
    }

    this.saveQueue();
    this.emitQueueUpdate();
  }

  disableEntries(ids: string[]): void {
    for (const id of ids) {
      const entry = this.entries.get(id);
      if (entry) {
        entry.enabled = false;
        entry.updatedAt = Date.now();
      }
    }

    this.saveQueue();
    this.emitQueueUpdate();
  }

  deleteEntries(ids: string[]): void {
    for (const id of ids) {
      this.deleteEntry(id);
    }
  }

  // ---------------------------------------------------------------------------
  // JOB OPERATIONS
  // ---------------------------------------------------------------------------

  async startQueue(): Promise<void> {
    if (!this.dispatcher) return;

    const enabledEntries = this.getEnabledEntries();
    if (enabledEntries.length === 0) return;

    // Create jobs for enabled entries
    for (const entry of enabledEntries) {
      const job = this.dispatcher.createJob(entry);
      this.jobs.set(job.id, job);
      await this.dispatcher.startJob(job.id, entry);
    }

    this.dispatcher.start();
  }

  async stopQueue(): Promise<void> {
    if (!this.dispatcher) return;
    await this.dispatcher.stop();
  }

  pauseQueue(): void {
    this.dispatcher?.pause();
  }

  resumeQueue(): void {
    this.dispatcher?.resume();
  }

  pauseJob(jobId: string): void {
    this.dispatcher?.pauseJob(jobId);
  }

  resumeJob(jobId: string): void {
    this.dispatcher?.resumeJob(jobId);
  }

  cancelJob(jobId: string): void {
    this.dispatcher?.cancelJob(jobId);
  }

  cancelAllJobs(): void {
    for (const job of this.jobs.values()) {
      if (job.state === 'running' || job.state === 'queued' || job.state === 'paused') {
        this.dispatcher?.cancelJob(job.id);
      }
    }
  }

  updateJobTarget(jobId: string, target: number): void {
    this.dispatcher?.updateJobTarget(jobId, target);
  }

  getJob(id: string): Job | null {
    return this.jobs.get(id) || null;
  }

  getActiveJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(
      j => j.state === 'queued' || j.state === 'running' || j.state === 'paused'
    );
  }

  getJobHistory(): Job[] {
    return [...this.jobHistory];
  }

  // ---------------------------------------------------------------------------
  // QUICK GENERATE
  // ---------------------------------------------------------------------------

  async quickGenerate(request: QuickGenerateRequest): Promise<QuickGenerateResult> {
    if (!this.settings) {
      throw new Error('Store not initialized');
    }

    const client = getAPIClient();

    // Compress references if any
    const imageDataUrls: string[] = [];
    if (request.references.length > 0) {
      const budget = calculatePerImageBudget(request.references.length, this.settings.payload);

      for (const refPath of request.references) {
        const compressed = await compressImage(refPath, budget, this.settings.compression);
        imageDataUrls.push(`data:image/jpeg;base64,${compressed.base64}`);
      }
    }

    // Build payload
    const modelConfig = this.settings.models.find(m => m.id === request.model);
    const payload = modelConfig?.payloadType === 'resolution'
      ? {
          prompt: request.prompt,
          model: request.model,
          resolution: request.resolution.preset || 'auto',
          aspect_ratio: request.resolution.aspectRatio,
          nImages: request.imagesPerBatch,
          responseFormat: 'b64_json' as const,
          showExplicitContent: true,
          imageDataUrls: imageDataUrls.length > 0 ? imageDataUrls : undefined,
          style: request.style,
        }
      : {
          prompt: request.prompt,
          model: request.model,
          width: request.resolution.width || 4096,
          height: request.resolution.height || 4096,
          nImages: request.imagesPerBatch,
          responseFormat: 'b64_json' as const,
          showExplicitContent: true,
          imageDataUrls: imageDataUrls.length > 0 ? imageDataUrls : undefined,
          style: request.style,
        };

    // Execute
    const savedFiles = await client.generateAndSave(
      payload,
      this.settings.outputDir || IMAGE_GEN_OUTPUTS_DIR,
      `quick_${Date.now()}`
    );

    const images: GeneratedImage[] = savedFiles.map((f, i) => ({
      id: crypto.randomUUID(),
      path: f.path,
      filename: f.filename,
      jobId: 'quick',
      batchId: 'quick',
      model: request.model,
      prompt: request.prompt,
      createdAt: Date.now(),
      size: f.size,
    }));

    return {
      id: crypto.randomUUID(),
      images,
      prompt: request.prompt,
      model: request.model,
      createdAt: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // PROMPT LIBRARY
  // ---------------------------------------------------------------------------

  async getPrompts(): Promise<PromptFile[]> {
    return listPrompts(this.settings?.promptsDir || IMAGE_GEN_PROMPTS_DIR);
  }

  async loadPrompt(name: string): Promise<string> {
    return loadPrompt(name, this.settings?.promptsDir || IMAGE_GEN_PROMPTS_DIR);
  }

  async savePrompt(name: string, content: string): Promise<void> {
    await savePrompt(name, content, this.settings?.promptsDir || IMAGE_GEN_PROMPTS_DIR);
  }

  async deletePrompt(name: string): Promise<void> {
    await deletePrompt(name, this.settings?.promptsDir || IMAGE_GEN_PROMPTS_DIR);
  }

  async renamePrompt(oldName: string, newName: string): Promise<void> {
    await renamePrompt(oldName, newName, this.settings?.promptsDir || IMAGE_GEN_PROMPTS_DIR);
  }

  // ---------------------------------------------------------------------------
  // REFERENCE BROWSER
  // ---------------------------------------------------------------------------

  getReferenceRoots() {
    return getRoots(this.settings?.pathAliases || {});
  }

  async getFolderContents(path: string) {
    return getFolderContents(path);
  }

  async getFolderStats(path: string) {
    return getFolderStats(path);
  }

  // ---------------------------------------------------------------------------
  // OUTPUT GALLERY
  // ---------------------------------------------------------------------------

  async getOutputImages(filters?: GalleryFilters): Promise<GeneratedImage[]> {
    const outputDir = this.settings?.outputDir || IMAGE_GEN_OUTPUTS_DIR;
    const images: GeneratedImage[] = [];

    try {
      const entries = await readdir(outputDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
          const fullPath = join(outputDir, entry.name);
          const stats = await stat(fullPath);

          images.push({
            id: entry.name,
            path: fullPath,
            filename: entry.name,
            jobId: 'unknown',
            batchId: 'unknown',
            model: 'unknown',
            prompt: '',
            createdAt: stats.mtimeMs,
            size: stats.size,
          });
        }
      }

      // Apply filters
      let filtered = images;

      if (filters?.dateRange) {
        filtered = filtered.filter(
          img => img.createdAt >= filters.dateRange!.start && img.createdAt <= filters.dateRange!.end
        );
      }

      // Sort
      switch (filters?.sortBy) {
        case 'oldest':
          filtered.sort((a, b) => a.createdAt - b.createdAt);
          break;
        case 'name':
          filtered.sort((a, b) => a.filename.localeCompare(b.filename));
          break;
        case 'newest':
        default:
          filtered.sort((a, b) => b.createdAt - a.createdAt);
      }

      return filtered;
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // PIPELINE STATE
  // ---------------------------------------------------------------------------

  getPipelineState(): PipelineState {
    const dispatcher = this.dispatcher;
    const rateLimiter = getRateLimiter();
    const concurrency = getConcurrencyLimiter();

    return {
      running: dispatcher?.isRunning() || false,
      rateLimiter: {
        config: rateLimiter.getConfig(),
        state: rateLimiter.getState(),
      },
      concurrency: {
        config: concurrency.getConfig(),
        state: concurrency.getState(),
      },
      queue: {
        queued: dispatcher?.getState().queuedBatches || 0,
        inFlight: dispatcher?.getState().inFlightBatches || 0,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------

  private async loadQueue(): Promise<void> {
    try {
      const content = await readFile(IMAGE_GEN_QUEUE_FILE, 'utf-8');
      const data = JSON.parse(content) as QueueFile;

      // Load groups
      this.groups.clear();
      this.groupOrder = [];
      for (const group of data.groups) {
        this.groups.set(group.id, group);
        this.groupOrder.push(group.id);
      }

      // Load entries
      this.entries.clear();
      for (const entry of data.entries) {
        this.entries.set(entry.id, entry);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[ImageGenStore] Failed to load queue:', err);
      }
      // Create default group
      this.createGroup('Default');
    }
  }

  private async saveQueue(): Promise<void> {
    const data: QueueFile = {
      version: 1,
      groups: Array.from(this.groups.values()),
      entries: Array.from(this.entries.values()),
    };

    try {
      await writeFile(IMAGE_GEN_QUEUE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[ImageGenStore] Failed to save queue:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  private emitEvent(type: ImageGenEventType, data: any): void {
    const event: ImageGenEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.emit('event', event);
  }

  private emitQueueUpdate(): void {
    this.emitEvent('queue-updated', {
      groups: Array.from(this.groups.values()),
      entries: Object.fromEntries(this.entries),
    });
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let imageGenStoreInstance: ImageGenStore | null = null;

export function getImageGenStore(): ImageGenStore {
  if (!imageGenStoreInstance) {
    imageGenStoreInstance = new ImageGenStore();
  }
  return imageGenStoreInstance;
}

export function resetImageGenStore(): void {
  imageGenStoreInstance = null;
}
