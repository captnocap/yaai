// =============================================================================
// REQUEST DISPATCHER
// =============================================================================
// Orchestrates queue processing with rate limiting and concurrency control.
// Handles auto-pause on failures, retry logic, and live target adjustment.

import { EventEmitter } from 'events';
import type {
  Job,
  JobState,
  JobStats,
  JobError,
  BatchRequest,
  BatchState,
  QueueEntry,
  ModelConfig,
  FailurePolicy,
  SavedFile,
  ResolvedReference,
  CompressionResult,
} from '../../../mainview/types/image-gen';
import { getRateLimiter } from './rate-limiter';
import { getConcurrencyLimiter } from './concurrency-limiter';
import { getAPIClient, buildPayload, APIClientError } from './api-client';
import { compressImage } from './image-compressor';
import { resolvePattern } from './reference-resolver';
import { processPrompt, resolvePromptConfig } from './prompt-processor';

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_FAILURE_POLICY: FailurePolicy = {
  consecutiveFailureThreshold: 5,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
  },
  retryableErrors: [429, 500, 502, 503, 504],
  fatalErrors: [400, 401, 413],
};

// -----------------------------------------------------------------------------
// DISPATCHER
// -----------------------------------------------------------------------------

export class RequestDispatcher extends EventEmitter {
  private running: boolean = false;
  private paused: boolean = false;
  private cancelRequested: boolean = false;

  private failurePolicy: FailurePolicy;
  private modelConfigs: Map<string, ModelConfig> = new Map();

  private jobs: Map<string, Job> = new Map();
  private batchQueue: BatchRequest[] = [];
  private inFlightBatches: Map<string, BatchRequest> = new Map();

  private promptsDir: string = '';
  private outputDir: string = '';
  private referencesDir: string = '';
  private perImageBudget: number = 400 * 1024;

  constructor(failurePolicy: FailurePolicy = DEFAULT_FAILURE_POLICY) {
    super();
    this.failurePolicy = failurePolicy;

    // Listen for slot availability
    getConcurrencyLimiter().on('slot-available', () => {
      if (this.running && !this.paused) {
        this.processQueue();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------

  configure(config: {
    failurePolicy?: FailurePolicy;
    models?: ModelConfig[];
    promptsDir?: string;
    outputDir?: string;
    referencesDir?: string;
    perImageBudget?: number;
  }): void {
    if (config.failurePolicy) {
      this.failurePolicy = config.failurePolicy;
    }
    if (config.models) {
      this.modelConfigs.clear();
      for (const model of config.models) {
        this.modelConfigs.set(model.id, model);
      }
    }
    if (config.promptsDir) this.promptsDir = config.promptsDir;
    if (config.outputDir) this.outputDir = config.outputDir;
    if (config.referencesDir) this.referencesDir = config.referencesDir;
    if (config.perImageBudget) this.perImageBudget = config.perImageBudget;
  }

  // ---------------------------------------------------------------------------
  // JOB MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a new job from a queue entry.
   */
  createJob(entry: QueueEntry): Job {
    const expectedBatches = entry.executionMode === 'fixed'
      ? entry.batchCount
      : Math.ceil((entry.targetImages || 0) / entry.imagesPerBatch);

    const job: Job = {
      id: crypto.randomUUID(),
      queueEntryId: entry.id,
      state: 'queued',
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      stats: {
        totalBatches: 0,
        successfulBatches: 0,
        failedBatches: 0,
        totalImages: 0,
        expectedBatches,
        expectedImages: expectedBatches * entry.imagesPerBatch,
      },
      consecutiveFailures: 0,
      lastError: null,
      autoPaused: false,
      pauseReason: null,
      liveConfig: {
        targetImages: entry.targetImages || expectedBatches * entry.imagesPerBatch,
        paused: false,
      },
      resolvedReferences: null,
    };

    this.jobs.set(job.id, job);
    this.emit('job-created', job);
    return job;
  }

  /**
   * Start processing a job.
   */
  async startJob(jobId: string, entry: QueueEntry): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.state = 'running';
    job.startedAt = Date.now();
    this.emit('job-started', job);

    try {
      // Resolve references once per job
      if (!job.resolvedReferences) {
        job.resolvedReferences = await this.resolveReferences(entry);
      }

      // Queue batches
      await this.queueBatches(job, entry);

      // Start processing
      this.processQueue();
    } catch (error) {
      this.handleJobError(job, error as Error);
    }
  }

  /**
   * Pause a specific job.
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.state !== 'running') return;

    job.state = 'paused';
    job.liveConfig.paused = true;
    this.emit('job-paused', job);
  }

  /**
   * Resume a paused job.
   */
  resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || job.state !== 'paused') return;

    job.state = 'running';
    job.liveConfig.paused = false;
    job.autoPaused = false;
    job.pauseReason = null;
    job.consecutiveFailures = 0;

    this.emit('job-resumed', job);
    this.processQueue();
  }

  /**
   * Cancel a job.
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.state = 'cancelled';
    job.finishedAt = Date.now();

    // Remove pending batches for this job
    this.batchQueue = this.batchQueue.filter(b => b.jobId !== jobId);

    this.emit('job-cancelled', job);
  }

  /**
   * Update job target (live adjustment).
   */
  updateJobTarget(jobId: string, newTarget: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.liveConfig.targetImages = newTarget;
    job.stats.expectedImages = newTarget;
    job.stats.expectedBatches = Math.ceil(newTarget / (job.stats.expectedImages / job.stats.expectedBatches));

    this.emit('job-target-updated', job);
  }

  /**
   * Get a job by ID.
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all active jobs.
   */
  getActiveJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(
      j => j.state === 'queued' || j.state === 'running' || j.state === 'paused'
    );
  }

  // ---------------------------------------------------------------------------
  // PIPELINE CONTROL
  // ---------------------------------------------------------------------------

  /**
   * Start the dispatcher.
   */
  start(): void {
    this.running = true;
    this.paused = false;
    this.cancelRequested = false;
    this.emit('started');
    this.processQueue();
  }

  /**
   * Stop the dispatcher (let in-flight complete).
   */
  async stop(): Promise<void> {
    this.running = false;
    this.emit('stopping');

    // Wait for in-flight requests to complete
    while (this.inFlightBatches.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('stopped');
  }

  /**
   * Force stop (abort in-flight).
   */
  forceStop(): void {
    this.running = false;
    this.cancelRequested = true;
    this.batchQueue = [];
    this.inFlightBatches.clear();
    this.emit('force-stopped');
  }

  /**
   * Pause all processing.
   */
  pause(): void {
    this.paused = true;
    this.emit('paused');
  }

  /**
   * Resume processing.
   */
  resume(): void {
    this.paused = false;
    this.emit('resumed');
    this.processQueue();
  }

  /**
   * Check if dispatcher is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if dispatcher is paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  // ---------------------------------------------------------------------------
  // QUEUE PROCESSING
  // ---------------------------------------------------------------------------

  private async processQueue(): Promise<void> {
    if (!this.running || this.paused || this.cancelRequested) {
      return;
    }

    const rateLimiter = getRateLimiter();
    const concurrencyLimiter = getConcurrencyLimiter();

    while (this.batchQueue.length > 0 && !this.cancelRequested) {
      // Check if job is paused
      const nextBatch = this.batchQueue[0];
      const job = this.jobs.get(nextBatch.jobId);
      if (job?.liveConfig.paused) {
        // Skip this batch, try next
        this.batchQueue.shift();
        continue;
      }

      // Check concurrency
      if (!concurrencyLimiter.canStart()) {
        // Wait for slot
        break;
      }

      // Check rate limit
      if (!rateLimiter.canMakeCall()) {
        const waitTime = rateLimiter.getNextAvailableTime();
        this.emit('rate-limited', { waitTime });
        setTimeout(() => this.processQueue(), waitTime);
        break;
      }

      // Dequeue and process
      const batch = this.batchQueue.shift()!;
      rateLimiter.recordCall();
      concurrencyLimiter.acquire();

      this.inFlightBatches.set(batch.id, batch);
      batch.state = 'in-flight';
      batch.startedAt = Date.now();

      this.emit('batch-started', batch);

      // Execute asynchronously
      this.executeBatch(batch)
        .then(result => this.handleBatchSuccess(batch, result))
        .catch(error => this.handleBatchError(batch, error))
        .finally(() => {
          concurrencyLimiter.release();
          this.inFlightBatches.delete(batch.id);
        });
    }
  }

  private async queueBatches(job: Job, entry: QueueEntry): Promise<void> {
    const batchCount = entry.executionMode === 'fixed'
      ? entry.batchCount
      : Math.ceil(job.liveConfig.targetImages / entry.imagesPerBatch);

    for (let i = 0; i < batchCount; i++) {
      const batch: BatchRequest = {
        id: crypto.randomUUID(),
        jobId: job.id,
        batchIndex: i,
        state: 'queued',
        queuedAt: Date.now(),
        startedAt: null,
        completedAt: null,
        imageCount: 0,
        savedFiles: [],
        error: null,
        promptUsed: '',
        referencesUsed: [],
        modelUsed: entry.model,
      };

      this.batchQueue.push(batch);
    }
  }

  private async executeBatch(batch: BatchRequest): Promise<SavedFile[]> {
    const job = this.jobs.get(batch.jobId);
    if (!job) throw new Error('Job not found');

    // Get entry (would be passed or stored)
    // For now, we need to reconstruct from job

    // Resolve prompt (with wildcards)
    const prompt = await this.resolvePrompt(job);
    batch.promptUsed = prompt;

    // Compress references
    const compressedRefs = await this.compressReferences(job);
    batch.referencesUsed = compressedRefs.map(r => r.base64.slice(0, 50) + '...');

    // Get model config
    const modelConfig = this.modelConfigs.get(batch.modelUsed);
    if (!modelConfig) {
      throw new Error(`Model not found: ${batch.modelUsed}`);
    }

    // Build payload - need entry data
    // This is a simplified version - in real implementation,
    // entry would be stored with job or passed through
    const payload = {
      prompt,
      model: batch.modelUsed,
      width: 4096,
      height: 4096,
      nImages: 1,
      responseFormat: 'b64_json' as const,
      showExplicitContent: true,
      imageDataUrls: compressedRefs.map(r => `data:image/jpeg;base64,${r.base64}`),
    };

    // Call API
    const client = getAPIClient();
    const result = await client.generateAndSave(
      payload,
      this.outputDir,
      `gen_${job.id.slice(0, 8)}_${batch.batchIndex}`
    );

    batch.imageCount = result.length;
    return result;
  }

  private async resolvePrompt(job: Job): Promise<string> {
    // In real implementation, this would use the entry's prompt config
    // For now, return a placeholder
    return 'Generated prompt';
  }

  private async compressReferences(job: Job): Promise<CompressionResult[]> {
    if (!job.resolvedReferences || job.resolvedReferences.length === 0) {
      return [];
    }

    const compressed: CompressionResult[] = [];

    for (const ref of job.resolvedReferences) {
      for (const path of ref.resolvedPaths) {
        const result = await compressImage(path, this.perImageBudget);
        compressed.push(result);
      }
    }

    return compressed;
  }

  private async resolveReferences(entry: QueueEntry): Promise<ResolvedReference[]> {
    const resolved: ResolvedReference[] = [];

    for (const pattern of entry.references) {
      const paths = await resolvePattern(pattern, this.referencesDir);
      resolved.push({
        originalPattern: pattern,
        resolvedPaths: paths,
        base64Data: [], // Will be populated during compression
      });
    }

    return resolved;
  }

  // ---------------------------------------------------------------------------
  // RESULT HANDLING
  // ---------------------------------------------------------------------------

  private handleBatchSuccess(batch: BatchRequest, savedFiles: SavedFile[]): void {
    batch.state = 'completed';
    batch.completedAt = Date.now();
    batch.savedFiles = savedFiles;
    batch.imageCount = savedFiles.length;

    const job = this.jobs.get(batch.jobId);
    if (job) {
      job.stats.successfulBatches++;
      job.stats.totalBatches++;
      job.stats.totalImages += savedFiles.length;
      job.consecutiveFailures = 0;

      // Check if job is complete
      this.checkJobCompletion(job);

      this.emit('batch-completed', { batch, job });
    }

    // Continue processing
    if (this.running && !this.paused) {
      this.processQueue();
    }
  }

  private handleBatchError(batch: BatchRequest, error: Error): void {
    batch.state = 'failed';
    batch.completedAt = Date.now();

    const jobError: JobError = {
      message: error.message,
      code: error instanceof APIClientError ? error.status : null,
      timestamp: Date.now(),
      batchIndex: batch.batchIndex,
      details: error instanceof APIClientError ? error.details || null : null,
      hint: error instanceof APIClientError ? error.getHint() : null,
    };

    batch.error = jobError;

    const job = this.jobs.get(batch.jobId);
    if (job) {
      job.stats.failedBatches++;
      job.stats.totalBatches++;
      job.lastError = jobError;
      job.consecutiveFailures++;

      // Check for auto-pause
      if (job.consecutiveFailures >= this.failurePolicy.consecutiveFailureThreshold) {
        job.state = 'paused';
        job.autoPaused = true;
        job.pauseReason = `Auto-paused after ${job.consecutiveFailures} consecutive failures`;
        this.emit('job-auto-paused', { job, error: jobError });
      }

      // Check if should retry
      if (error instanceof APIClientError && error.isRetryable()) {
        // Re-queue the batch with backoff
        const backoff = this.calculateBackoff(job.consecutiveFailures);
        setTimeout(() => {
          if (job.state === 'running') {
            batch.state = 'queued';
            batch.error = null;
            this.batchQueue.push(batch);
            this.processQueue();
          }
        }, backoff);
      }

      this.emit('batch-failed', { batch, job, error: jobError });
    }

    // Continue processing other batches
    if (this.running && !this.paused) {
      this.processQueue();
    }
  }

  private handleJobError(job: Job, error: Error): void {
    job.state = 'failed';
    job.finishedAt = Date.now();
    job.lastError = {
      message: error.message,
      code: null,
      timestamp: Date.now(),
      batchIndex: -1,
      details: null,
      hint: null,
    };

    this.emit('job-failed', { job, error: job.lastError });
  }

  private checkJobCompletion(job: Job): void {
    // For target mode, check if we've reached target
    if (job.stats.totalImages >= job.liveConfig.targetImages) {
      job.state = 'completed';
      job.finishedAt = Date.now();
      this.emit('job-completed', job);
      return;
    }

    // For fixed mode, check if all batches processed
    if (job.stats.totalBatches >= job.stats.expectedBatches) {
      job.state = 'completed';
      job.finishedAt = Date.now();
      this.emit('job-completed', job);
    }
  }

  private calculateBackoff(failures: number): number {
    const { backoffMs, backoffMultiplier, maxBackoffMs } = this.failurePolicy.retryPolicy;
    const backoff = backoffMs * Math.pow(backoffMultiplier, failures - 1);
    return Math.min(backoff, maxBackoffMs);
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  getState(): DispatcherState {
    return {
      running: this.running,
      paused: this.paused,
      queuedBatches: this.batchQueue.length,
      inFlightBatches: this.inFlightBatches.size,
      activeJobs: this.getActiveJobs().length,
      rateLimiter: getRateLimiter().getState(),
      concurrency: getConcurrencyLimiter().getState(),
    };
  }
}

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface DispatcherState {
  running: boolean;
  paused: boolean;
  queuedBatches: number;
  inFlightBatches: number;
  activeJobs: number;
  rateLimiter: {
    available: number;
    max: number;
    nextAvailableIn: number;
  };
  concurrency: {
    active: number;
    max: number;
    available: number;
  };
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let dispatcherInstance: RequestDispatcher | null = null;

export function getDispatcher(failurePolicy?: FailurePolicy): RequestDispatcher {
  if (!dispatcherInstance) {
    dispatcherInstance = new RequestDispatcher(failurePolicy);
  }
  return dispatcherInstance;
}

export function resetDispatcher(): void {
  if (dispatcherInstance) {
    dispatcherInstance.forceStop();
  }
  dispatcherInstance = null;
}
