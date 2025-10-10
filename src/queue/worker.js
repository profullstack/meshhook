// Worker - Queue Job Processor
// Processes workflow jobs from PGMQ queue with retry and DLQ support

import { QueueService } from './queue-service.js';
import { DLQService } from './dlq-service.js';
import { RetryStrategy } from './retry-strategy.js';

/**
 * Worker class for processing jobs from the queue
 * Handles job execution, retries, and dead letter queue management
 */
export class Worker {
  /**
   * Create a Worker instance
   * @param {Object} config - Worker configuration
   * @param {Object} config.supabaseClient - Supabase client instance
   * @param {Function} config.jobHandler - Function to process jobs
   * @param {string} config.queueName - Queue name (default: 'workflow_jobs')
   * @param {number} config.pollIntervalMs - Polling interval in ms (default: 1000)
   * @param {number} config.visibilityTimeoutSeconds - Visibility timeout (default: 30)
   * @param {Object} config.retryConfig - Retry configuration
   */
  constructor(config) {
    if (!config.supabaseClient) {
      throw new Error('Supabase client is required');
    }
    if (!config.jobHandler || typeof config.jobHandler !== 'function') {
      throw new Error('Job handler function is required');
    }

    this.client = config.supabaseClient;
    this.jobHandler = config.jobHandler;
    this.queueName = config.queueName || 'workflow_jobs';
    this.pollIntervalMs = config.pollIntervalMs || 1000;
    this.visibilityTimeoutSeconds = config.visibilityTimeoutSeconds || 30;

    // Initialize services
    this.queueService = new QueueService(this.client, this.queueName);
    this.dlqService = new DLQService(this.client);
    this.retryStrategy = new RetryStrategy(config.retryConfig);

    // Worker state
    this.isRunning = false;
    this.currentJob = null;
    this.stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      movedToDLQ: 0,
    };
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      console.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Worker started, polling queue: ${this.queueName}`);

    // Start polling loop
    this._pollLoop();
  }

  /**
   * Stop the worker
   */
  async stop() {
    if (!this.isRunning) {
      console.warn('Worker is not running');
      return;
    }

    this.isRunning = false;
    console.log('Worker stopping...');

    // Wait for current job to complete
    if (this.currentJob) {
      console.log('Waiting for current job to complete...');
      await this._waitForJobCompletion();
    }

    console.log('Worker stopped');
  }

  /**
   * Get worker statistics
   * @returns {Object} Worker statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Main polling loop
   * @private
   */
  async _pollLoop() {
    while (this.isRunning) {
      try {
        await this._processNextJob();
      } catch (error) {
        console.error('Error in poll loop:', error);
      }

      // Wait before next poll
      await this._sleep(this.pollIntervalMs);
    }
  }

  /**
   * Process the next job from the queue
   * @private
   */
  async _processNextJob() {
    try {
      // Dequeue a job
      const job = await this.queueService.dequeue(
        this.visibilityTimeoutSeconds
      );

      if (!job) {
        // No jobs available
        return;
      }

      this.currentJob = job;
      this.stats.processed++;

      console.log(`Processing job ${job.msg_id}:`, {
        run_id: job.message.run_id,
        attempt: job.message.attempt || 1,
      });

      // Process the job
      await this._executeJob(job);

      this.currentJob = null;
    } catch (error) {
      console.error('Error processing job:', error);
      this.currentJob = null;
    }
  }

  /**
   * Execute a job with retry logic
   * @private
   * @param {Object} job - Job to execute
   */
  async _executeJob(job) {
    const attempt = job.message.attempt || 1;
    const maxAttempts = job.message.max_attempts || 5;

    try {
      // Execute the job handler
      await this.jobHandler(job.message);

      // Job succeeded - acknowledge and delete from queue
      await this.queueService.acknowledge(job.msg_id);
      this.stats.succeeded++;

      console.log(`Job ${job.msg_id} completed successfully`);
    } catch (error) {
      console.error(`Job ${job.msg_id} failed:`, error.message);
      this.stats.failed++;

      // Determine if we should retry or move to DLQ
      const retryInfo = this.retryStrategy.getRetryInfo(attempt);

      if (retryInfo.shouldMoveToDeadLetter) {
        // Max retries exceeded - move to DLQ
        await this._moveJobToDLQ(job, error);
      } else {
        // Retry the job
        await this._retryJob(job, error, retryInfo);
      }
    }
  }

  /**
   * Retry a failed job
   * @private
   * @param {Object} job - Failed job
   * @param {Error} error - Error that caused failure
   * @param {Object} retryInfo - Retry information
   */
  async _retryJob(job, error, retryInfo) {
    try {
      // Archive the current job
      await this.queueService.archiveJob(job.msg_id);

      // Enqueue with incremented attempt and delay
      const retryJobData = {
        ...job.message,
        attempt: retryInfo.attempt + 1,
        last_error: error.message,
        last_error_at: new Date().toISOString(),
      };

      await this.queueService.enqueue(retryJobData, retryInfo.delaySeconds);

      this.stats.retried++;

      console.log(
        `Job ${job.msg_id} scheduled for retry (attempt ${retryInfo.attempt + 1}/${retryInfo.maxAttempts}) in ${retryInfo.delaySeconds}s`
      );
    } catch (retryError) {
      console.error('Failed to retry job:', retryError);
      // If retry fails, try to move to DLQ
      await this._moveJobToDLQ(job, error);
    }
  }

  /**
   * Move a failed job to the dead letter queue
   * @private
   * @param {Object} job - Failed job
   * @param {Error} error - Error that caused failure
   */
  async _moveJobToDLQ(job, error) {
    try {
      await this.dlqService.moveToDeadLetter(
        job,
        error.message,
        error.stack
      );

      this.stats.movedToDLQ++;

      console.log(
        `Job ${job.msg_id} moved to DLQ after ${job.message.attempt || 1} attempts`
      );
    } catch (dlqError) {
      console.error('Failed to move job to DLQ:', dlqError);
      // Last resort - just acknowledge to prevent infinite loop
      await this.queueService.acknowledge(job.msg_id);
    }
  }

  /**
   * Sleep for specified milliseconds
   * @private
   * @param {number} ms - Milliseconds to sleep
   */
  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for current job to complete
   * @private
   */
  async _waitForJobCompletion() {
    const maxWaitMs = 60000; // 1 minute max wait
    const startTime = Date.now();

    while (this.currentJob && Date.now() - startTime < maxWaitMs) {
      await this._sleep(100);
    }

    if (this.currentJob) {
      console.warn('Job did not complete within timeout, forcing stop');
      this.currentJob = null;
    }
  }
}

/**
 * Create and start a worker
 * @param {Object} config - Worker configuration
 * @returns {Promise<Worker>} Started worker instance
 */
export async function createWorker(config) {
  const worker = new Worker(config);
  await worker.start();
  return worker;
}

/**
 * Create a simple job handler for testing
 * @param {Function} processFn - Function to process job message
 * @returns {Function} Job handler function
 */
export function createJobHandler(processFn) {
  return async (message) => {
    if (!processFn || typeof processFn !== 'function') {
      throw new Error('Process function is required');
    }
    return await processFn(message);
  };
}