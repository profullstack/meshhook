// DLQService - Dead Letter Queue Management
// Issue #93: Implement DLQ (Dead Letter Queue)
// Handles failed jobs that exceed max retry attempts

/**
 * DLQService class for managing dead letter queue operations
 * Provides functionality to move, inspect, replay, and manage failed jobs
 */
export class DLQService {
  /**
   * Create a DLQService instance
   * @param {Object} supabaseClient - Supabase client instance
   * @param {string} dlqName - Name of the dead letter queue (default: 'workflow_jobs_dlq')
   */
  constructor(supabaseClient, dlqName = 'workflow_jobs_dlq') {
    if (!supabaseClient) {
      throw new Error('Supabase client is required');
    }
    this.client = supabaseClient;
    this.dlqName = dlqName;
  }

  /**
   * Move a failed job to the dead letter queue
   * @param {Object} job - Job object from main queue
   * @param {string} errorMessage - Error message describing the failure
   * @param {string} errorStack - Optional error stack trace
   * @returns {Promise<Object>} Result containing dlq_msg_id
   */
  async moveToDeadLetter(job, errorMessage = null, errorStack = null) {
    if (!job || !job.message) {
      throw new Error('Invalid job object');
    }

    try {
      // Enhance message with DLQ metadata
      const dlqMessage = {
        ...job.message,
        original_msg_id: job.msg_id,
        moved_to_dlq_at: new Date().toISOString(),
        error_message: errorMessage || 'Unknown error',
        error_stack: errorStack,
        original_enqueued_at: job.enqueued_at,
        read_count: job.read_ct || 0,
      };

      // Send to DLQ using PGMQ
      const { data, error } = await this.client.rpc('pgmq_send', {
        queue_name: this.dlqName,
        msg: dlqMessage,
        delay: 0,
      });

      if (error) {
        throw new Error(`Failed to move job to DLQ: ${error.message}`);
      }

      const dlqMsgId = data;

      // Archive original message from main queue
      await this._archiveOriginalJob(job.msg_id);

      // Update job tracking
      await this._updateJobTracking(job.msg_id, {
        moved_to_dlq_at: new Date().toISOString(),
        error_message: errorMessage,
        error_stack: errorStack,
      });

      return { dlq_msg_id: dlqMsgId };
    } catch (error) {
      throw new Error(`Move to DLQ failed: ${error.message}`);
    }
  }

  /**
   * List jobs in the dead letter queue
   * @param {number} limit - Maximum number of jobs to return (default: 100)
   * @returns {Promise<Array>} Array of DLQ jobs
   */
  async listDeadLetterJobs(limit = 100) {
    try {
      const { data, error } = await this.client.rpc('pgmq_read', {
        queue_name: this.dlqName,
        vt: 0, // No visibility timeout for inspection
        qty: limit,
      });

      if (error) {
        throw new Error(`Failed to list DLQ jobs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`List DLQ jobs failed: ${error.message}`);
    }
  }

  /**
   * Get a specific job from the dead letter queue
   * @param {number} dlqMsgId - DLQ message ID
   * @returns {Promise<Object|null>} Job object or null if not found
   */
  async getDeadLetterJob(dlqMsgId) {
    try {
      const { data, error } = await this.client.rpc('pgmq_read', {
        queue_name: this.dlqName,
        vt: 0,
        qty: 1,
      });

      if (error) {
        throw new Error(`Failed to get DLQ job: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Find the specific message
      const job = data.find((j) => j.msg_id === dlqMsgId);
      return job || null;
    } catch (error) {
      throw new Error(`Get DLQ job failed: ${error.message}`);
    }
  }

  /**
   * Replay a job from DLQ back to the main queue
   * @param {number} dlqMsgId - DLQ message ID to replay
   * @param {string} targetQueue - Target queue name (default: 'workflow_jobs')
   * @returns {Promise<Object>} Result containing new_msg_id
   */
  async replayDeadLetterJob(dlqMsgId, targetQueue = 'workflow_jobs') {
    try {
      // Get the job from DLQ
      const jobs = await this.listDeadLetterJobs(1000);
      const job = jobs.find((j) => j.msg_id === dlqMsgId);

      if (!job) {
        throw new Error(`Job ${dlqMsgId} not found in DLQ`);
      }

      // Prepare message for replay (reset attempt counter)
      const replayMessage = {
        ...job.message,
        attempt: 1, // Reset attempt counter
        replayed_from_dlq: true,
        replayed_at: new Date().toISOString(),
        original_dlq_msg_id: dlqMsgId,
      };

      // Remove DLQ-specific metadata
      delete replayMessage.moved_to_dlq_at;
      delete replayMessage.error_message;
      delete replayMessage.error_stack;
      delete replayMessage.original_msg_id;

      // Send to target queue
      const { data, error } = await this.client.rpc('pgmq_send', {
        queue_name: targetQueue,
        msg: replayMessage,
        delay: 0,
      });

      if (error) {
        throw new Error(`Failed to replay job: ${error.message}`);
      }

      // Delete from DLQ
      await this.deleteDeadLetterJob(dlqMsgId);

      return { new_msg_id: data };
    } catch (error) {
      throw new Error(`Replay job failed: ${error.message}`);
    }
  }

  /**
   * Delete a job from the dead letter queue
   * @param {number} dlqMsgId - DLQ message ID to delete
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  async deleteDeadLetterJob(dlqMsgId) {
    try {
      const { data, error } = await this.client.rpc('pgmq_delete', {
        queue_name: this.dlqName,
        msg_id: dlqMsgId,
      });

      if (error) {
        throw new Error(`Failed to delete DLQ job: ${error.message}`);
      }

      return data === true;
    } catch (error) {
      throw new Error(`Delete DLQ job failed: ${error.message}`);
    }
  }

  /**
   * Get DLQ metrics
   * @returns {Promise<Object>} DLQ metrics
   */
  async getDLQMetrics() {
    try {
      const { data, error } = await this.client.rpc('get_queue_metrics', {
        p_queue_name: this.dlqName,
      });

      if (error) {
        throw new Error(`Failed to get DLQ metrics: ${error.message}`);
      }

      return data[0] || {
        dlq_name: this.dlqName,
        total_jobs: 0,
        oldest_job_age_seconds: null,
        newest_job_age_seconds: null,
      };
    } catch (error) {
      throw new Error(`Get DLQ metrics failed: ${error.message}`);
    }
  }

  /**
   * Purge all jobs from the dead letter queue
   * @returns {Promise<number>} Number of jobs purged
   */
  async purgeDLQ() {
    try {
      const { data, error } = await this.client.rpc('pgmq_purge_queue', {
        queue_name: this.dlqName,
      });

      if (error) {
        throw new Error(`Failed to purge DLQ: ${error.message}`);
      }

      return data || 0;
    } catch (error) {
      throw new Error(`Purge DLQ failed: ${error.message}`);
    }
  }

  /**
   * Get jobs grouped by error type
   * @returns {Promise<Object>} Jobs grouped by error message
   */
  async getJobsByErrorType() {
    try {
      const jobs = await this.listDeadLetterJobs(1000);

      // Group by error message
      const grouped = jobs.reduce((acc, job) => {
        const errorMsg = job.message.error_message || 'Unknown error';
        if (!acc[errorMsg]) {
          acc[errorMsg] = [];
        }
        acc[errorMsg].push(job);
        return acc;
      }, {});

      return grouped;
    } catch (error) {
      throw new Error(`Get jobs by error type failed: ${error.message}`);
    }
  }

  /**
   * Replay multiple jobs from DLQ
   * @param {Array<number>} dlqMsgIds - Array of DLQ message IDs
   * @param {string} targetQueue - Target queue name
   * @returns {Promise<Object>} Results with success and failure counts
   */
  async replayMultipleJobs(dlqMsgIds, targetQueue = 'workflow_jobs') {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const msgId of dlqMsgIds) {
      try {
        await this.replayDeadLetterJob(msgId, targetQueue);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          msg_id: msgId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Archive original job from main queue
   * @private
   * @param {number} msgId - Original message ID
   */
  async _archiveOriginalJob(msgId) {
    try {
      // Note: This assumes the job is still in the main queue
      // In practice, it may already be archived by the worker
      await this.client.rpc('pgmq_archive', {
        queue_name: 'workflow_jobs',
        msg_id: msgId,
      });
    } catch (error) {
      // Log but don't fail - job may already be archived
      console.warn(`Failed to archive original job ${msgId}:`, error.message);
    }
  }

  /**
   * Update job tracking record
   * @private
   * @param {number} msgId - Message ID
   * @param {Object} updates - Fields to update
   */
  async _updateJobTracking(msgId, updates) {
    try {
      const { error } = await this.client
        .from('job_tracking')
        .update(updates)
        .eq('msg_id', msgId);

      if (error) {
        console.error('Failed to update job tracking:', error.message);
      }
    } catch (error) {
      console.error('Failed to update job tracking:', error.message);
    }
  }
}

/**
 * Create a DLQService instance
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} dlqName - Optional DLQ name
 * @returns {DLQService} DLQService instance
 */
export function createDLQService(supabaseClient, dlqName) {
  return new DLQService(supabaseClient, dlqName);
}