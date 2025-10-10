// QueueService - PGMQ Queue Management
// Issue #91: Implement job enqueue/dequeue
// Provides interface for enqueuing, dequeuing, and managing workflow jobs

/**
 * QueueService class for managing PGMQ queues
 * Handles job enqueue, dequeue, acknowledgment, and monitoring
 */
export class QueueService {
  /**
   * Create a QueueService instance
   * @param {Object} supabaseClient - Supabase client instance
   * @param {string} queueName - Name of the queue (default: 'workflow_jobs')
   */
  constructor(supabaseClient, queueName = 'workflow_jobs') {
    if (!supabaseClient) {
      throw new Error('Supabase client is required');
    }
    this.client = supabaseClient;
    this.queueName = queueName;
  }

  /**
   * Enqueue a job to the queue
   * @param {Object} jobData - Job data containing run_id, workflow_id, project_id, etc.
   * @param {number} delaySeconds - Optional delay in seconds before job becomes visible
   * @returns {Promise<Object>} Result containing msg_id
   */
  async enqueue(jobData, delaySeconds = 0) {
    // Validate required fields
    if (!jobData.run_id) {
      throw new Error('Job data must include run_id');
    }
    if (!jobData.workflow_id) {
      throw new Error('Job data must include workflow_id');
    }
    if (!jobData.project_id) {
      throw new Error('Job data must include project_id');
    }

    try {
      // Prepare job payload
      const payload = {
        run_id: jobData.run_id,
        workflow_id: jobData.workflow_id,
        project_id: jobData.project_id,
        attempt: jobData.attempt || 1,
        max_attempts: jobData.max_attempts || 5,
        enqueued_at: new Date().toISOString(),
        metadata: jobData.metadata || {},
      };

      // Use PGMQ send function
      const { data, error } = await this.client.rpc('pgmq_send', {
        queue_name: this.queueName,
        msg: payload,
        delay: delaySeconds,
      });

      if (error) {
        throw new Error(`Failed to enqueue job: ${error.message}`);
      }

      // Track job in job_tracking table
      await this._trackJob({
        msg_id: data,
        run_id: jobData.run_id,
        queue_name: this.queueName,
        attempt: payload.attempt,
        max_attempts: payload.max_attempts,
      });

      return { msg_id: data };
    } catch (error) {
      throw new Error(`Enqueue failed: ${error.message}`);
    }
  }

  /**
   * Dequeue a job from the queue
   * @param {number} vtSeconds - Visibility timeout in seconds (default: 30)
   * @returns {Promise<Object|null>} Job object or null if queue is empty
   */
  async dequeue(vtSeconds = 30) {
    try {
      const { data, error } = await this.client.rpc('pgmq_read', {
        queue_name: this.queueName,
        vt: vtSeconds,
        qty: 1,
      });

      if (error) {
        throw new Error(`Failed to dequeue job: ${error.message}`);
      }

      // PGMQ returns array, get first item
      if (!data || data.length === 0) {
        return null;
      }

      const job = data[0];

      // Update job tracking with started_at timestamp
      await this._updateJobTracking(job.msg_id, {
        started_at: new Date().toISOString(),
      });

      return {
        msg_id: job.msg_id,
        message: job.message,
        enqueued_at: job.enqueued_at,
        vt: job.vt,
        read_ct: job.read_ct,
      };
    } catch (error) {
      throw new Error(`Dequeue failed: ${error.message}`);
    }
  }

  /**
   * Acknowledge and delete a processed job
   * @param {number} msgId - Message ID to acknowledge
   * @returns {Promise<boolean>} True if acknowledged, false otherwise
   */
  async acknowledge(msgId) {
    try {
      const { data, error } = await this.client.rpc('pgmq_delete', {
        queue_name: this.queueName,
        msg_id: msgId,
      });

      if (error) {
        throw new Error(`Failed to acknowledge job: ${error.message}`);
      }

      // Update job tracking with completed_at timestamp
      await this._updateJobTracking(msgId, {
        completed_at: new Date().toISOString(),
      });

      return data === true;
    } catch (error) {
      throw new Error(`Acknowledge failed: ${error.message}`);
    }
  }

  /**
   * Archive a job (move to archive table)
   * @param {number} msgId - Message ID to archive
   * @returns {Promise<boolean>} True if archived, false otherwise
   */
  async archiveJob(msgId) {
    try {
      const { data, error } = await this.client.rpc('pgmq_archive', {
        queue_name: this.queueName,
        msg_id: msgId,
      });

      if (error) {
        throw new Error(`Failed to archive job: ${error.message}`);
      }

      return data === true;
    } catch (error) {
      throw new Error(`Archive failed: ${error.message}`);
    }
  }

  /**
   * Get queue metrics
   * @returns {Promise<Object>} Queue metrics including length and age
   */
  async getQueueMetrics() {
    try {
      const { data, error } = await this.client.rpc('get_queue_metrics', {
        p_queue_name: this.queueName,
      });

      if (error) {
        throw new Error(`Failed to get queue metrics: ${error.message}`);
      }

      return data[0] || {
        queue_name: this.queueName,
        queue_length: 0,
        oldest_msg_age_seconds: null,
        newest_msg_age_seconds: null,
      };
    } catch (error) {
      throw new Error(`Get metrics failed: ${error.message}`);
    }
  }

  /**
   * Purge all messages from the queue
   * @returns {Promise<number>} Number of messages purged
   */
  async purgeQueue() {
    try {
      const { data, error } = await this.client.rpc('pgmq_purge_queue', {
        queue_name: this.queueName,
      });

      if (error) {
        throw new Error(`Failed to purge queue: ${error.message}`);
      }

      return data || 0;
    } catch (error) {
      throw new Error(`Purge failed: ${error.message}`);
    }
  }

  /**
   * Track job in job_tracking table
   * @private
   * @param {Object} trackingData - Job tracking data
   */
  async _trackJob(trackingData) {
    try {
      const { error } = await this.client.from('job_tracking').insert({
        msg_id: trackingData.msg_id,
        run_id: trackingData.run_id,
        queue_name: trackingData.queue_name,
        attempt: trackingData.attempt,
        max_attempts: trackingData.max_attempts,
      });

      if (error) {
        // Log error but don't fail the enqueue operation
        console.error('Failed to track job:', error.message);
      }
    } catch (error) {
      console.error('Failed to track job:', error.message);
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
 * Create a QueueService instance
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} queueName - Optional queue name
 * @returns {QueueService} QueueService instance
 */
export function createQueueService(supabaseClient, queueName) {
  return new QueueService(supabaseClient, queueName);
}