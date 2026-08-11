// QueueService - job queue management on Turso/libSQL
// Issue #91: Implement job enqueue/dequeue
//
// Previously this drove pgmq through Supabase RPC calls. It now sits on the
// SQLite-backed Queue in @meshhook/shared/lib/queue.js. The public methods and
// their return shapes are unchanged; the constructor takes a database handle
// where it used to take a Supabase client.

import { db as sharedDb } from "@meshhook/shared/lib/db.js";
import { Queue } from "@meshhook/shared/lib/queue.js";

/**
 * QueueService manages enqueue, dequeue, acknowledgment and monitoring of
 * workflow jobs, and mirrors each job's lifecycle into job_tracking.
 */
export class QueueService {
  /**
   * @param {object} [db] Database handle (defaults to the shared connection).
   * @param {string} [queueName] Queue to operate on.
   */
  constructor(db = sharedDb, queueName = "workflow_jobs") {
    if (!db) {
      throw new Error("Database handle is required");
    }
    this.db = db;
    this.queueName = queueName;
    this.queue = new Queue({ name: queueName, db });
  }

  /**
   * Enqueue a job.
   * @param {Object} jobData Must include run_id, workflow_id and project_id.
   * @param {number} delaySeconds Delay before the job becomes visible.
   * @returns {Promise<{msg_id: number}>}
   */
  async enqueue(jobData, delaySeconds = 0) {
    if (!jobData.run_id) {
      throw new Error("Job data must include run_id");
    }
    if (!jobData.workflow_id) {
      throw new Error("Job data must include workflow_id");
    }
    if (!jobData.project_id) {
      throw new Error("Job data must include project_id");
    }

    try {
      const payload = {
        run_id: jobData.run_id,
        workflow_id: jobData.workflow_id,
        project_id: jobData.project_id,
        attempt: jobData.attempt || 1,
        max_attempts: jobData.max_attempts || 5,
        enqueued_at: new Date().toISOString(),
        metadata: jobData.metadata || {},
      };

      const msgId = await this.queue.send(payload, delaySeconds);

      await this._trackJob({
        msg_id: msgId,
        run_id: jobData.run_id,
        queue_name: this.queueName,
        attempt: payload.attempt,
        max_attempts: payload.max_attempts,
      });

      return { msg_id: msgId };
    } catch (error) {
      throw new Error(`Enqueue failed: ${error.message}`);
    }
  }

  /**
   * Lease the next available job.
   * @param {number} vtSeconds Visibility timeout.
   * @returns {Promise<Object|null>} The job, or null when the queue is empty.
   */
  async dequeue(vtSeconds = 30) {
    try {
      const messages = await this.queue.read(vtSeconds, 1);
      if (messages.length === 0) {
        return null;
      }

      const job = messages[0];

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
   * Acknowledge a processed job, removing it from the queue.
   * @returns {Promise<boolean>}
   */
  async acknowledge(msgId) {
    try {
      const deleted = await this.queue.deleteMessage(msgId);

      await this._updateJobTracking(msgId, {
        completed_at: new Date().toISOString(),
      });

      return deleted;
    } catch (error) {
      throw new Error(`Acknowledge failed: ${error.message}`);
    }
  }

  /**
   * Move a job to the archive table.
   * @returns {Promise<boolean>}
   */
  async archiveJob(msgId) {
    try {
      return await this.queue.archive(msgId);
    } catch (error) {
      throw new Error(`Archive failed: ${error.message}`);
    }
  }

  /**
   * Return a leased job to the queue after `delaySeconds`, so a retry does not
   * have to wait out the full visibility timeout.
   * @returns {Promise<boolean>}
   */
  async requeue(msgId, delaySeconds = 0) {
    try {
      return await this.queue.setVisibilityTimeout(msgId, delaySeconds);
    } catch (error) {
      throw new Error(`Requeue failed: ${error.message}`);
    }
  }

  /**
   * Queue depth and message age.
   * @returns {Promise<Object>}
   */
  async getQueueMetrics() {
    try {
      return await this.queue.metrics();
    } catch (error) {
      throw new Error(`Get metrics failed: ${error.message}`);
    }
  }

  /**
   * Remove every message from the queue.
   * @returns {Promise<number>} Number of messages purged.
   */
  async purgeQueue() {
    try {
      return await this.queue.purge();
    } catch (error) {
      throw new Error(`Purge failed: ${error.message}`);
    }
  }

  /**
   * Insert the job_tracking row for a newly enqueued job.
   *
   * Tracking is observability, not correctness: a failure here is logged and
   * swallowed so it cannot fail the enqueue that already succeeded.
   * @private
   */
  async _trackJob(trackingData) {
    try {
      await this.db.none(
        `insert into job_tracking (msg_id, run_id, queue_name, attempt, max_attempts)
         values (?, ?, ?, ?, ?)`,
        [
          trackingData.msg_id,
          trackingData.run_id,
          trackingData.queue_name,
          trackingData.attempt,
          trackingData.max_attempts,
        ],
      );
    } catch (error) {
      console.error("Failed to track job:", error.message);
    }
  }

  /**
   * Patch the job_tracking row for a message.
   *
   * Column names come from a fixed allow-list rather than straight from the
   * caller, so this cannot be turned into arbitrary SQL.
   * @private
   */
  async _updateJobTracking(msgId, updates) {
    const ALLOWED = new Set([
      "started_at",
      "completed_at",
      "failed_at",
      "moved_to_dlq_at",
      "error_message",
      "error_stack",
      "attempt",
    ]);

    const columns = Object.keys(updates).filter((k) => ALLOWED.has(k));
    if (columns.length === 0) return;

    try {
      await this.db.none(
        `update job_tracking set ${columns.map((c) => `${c} = ?`).join(", ")}
          where msg_id = ?`,
        [...columns.map((c) => updates[c]), msgId],
      );
    } catch (error) {
      console.error("Failed to update job tracking:", error.message);
    }
  }
}

/**
 * @param {object} [db] Database handle.
 * @param {string} [queueName] Queue name.
 * @returns {QueueService}
 */
export function createQueueService(db, queueName) {
  return new QueueService(db, queueName);
}
