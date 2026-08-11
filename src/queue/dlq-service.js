// DLQService - dead letter queue management on Turso/libSQL
// Issue #92: Implement dead letter queue
//
// Ported from the pgmq/Supabase implementation. Behaviour is unchanged except
// that browsing the DLQ no longer leases messages: the old code called
// pgmq_read with vt=0, which incremented read_ct on every listing. Inspection
// now uses peek(), so read_ct reflects genuine delivery attempts.

import { db as sharedDb } from "@meshhook/shared/lib/db.js";
import { Queue } from "@meshhook/shared/lib/queue.js";

/**
 * Manages jobs that exhausted their retries, and replaying them once the
 * underlying fault is fixed.
 */
export class DLQService {
  /**
   * @param {object} [db] Database handle (defaults to the shared connection).
   * @param {string} [dlqName] Dead letter queue name.
   */
  constructor(db = sharedDb, dlqName = "workflow_jobs_dlq") {
    if (!db) {
      throw new Error("Database handle is required");
    }
    this.db = db;
    this.dlqName = dlqName;
    this.dlq = new Queue({ name: dlqName, db });
    this.mainQueue = new Queue({ name: "workflow_jobs", db });
  }

  /**
   * Move a failed job to the dead letter queue.
   * @param {Object} job Job from the main queue.
   * @param {string} [errorMessage] Failure description.
   * @param {string} [errorStack] Optional stack trace.
   * @returns {Promise<{dlq_msg_id: number}>}
   */
  async moveToDeadLetter(job, errorMessage = null, errorStack = null) {
    if (!job || !job.message) {
      throw new Error("Invalid job object");
    }

    try {
      const dlqMessage = {
        ...job.message,
        original_msg_id: job.msg_id,
        moved_to_dlq_at: new Date().toISOString(),
        error_message: errorMessage || "Unknown error",
        error_stack: errorStack,
        original_enqueued_at: job.enqueued_at,
        read_count: job.read_ct || 0,
      };

      const dlqMsgId = await this.dlq.send(dlqMessage, 0);

      await this._archiveOriginalJob(job.msg_id);

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
   * List jobs sitting in the DLQ. Does not lease or hide them.
   * @param {number} limit Maximum jobs to return.
   * @returns {Promise<Array>}
   */
  async listDeadLetterJobs(limit = 100) {
    try {
      return await this.dlq.peek(limit);
    } catch (error) {
      throw new Error(`List DLQ jobs failed: ${error.message}`);
    }
  }

  /**
   * Fetch one DLQ job by id.
   *
   * The Postgres version read a page of messages and searched it, so a job
   * outside the first page looked missing. This looks the id up directly.
   * @returns {Promise<Object|null>}
   */
  async getDeadLetterJob(dlqMsgId) {
    try {
      return await this.dlq.peekOne(dlqMsgId);
    } catch (error) {
      throw new Error(`Get DLQ job failed: ${error.message}`);
    }
  }

  /**
   * Replay a job from the DLQ back onto a live queue, resetting its attempt
   * counter and stripping the failure metadata.
   * @returns {Promise<{new_msg_id: number}>}
   */
  async replayDeadLetterJob(dlqMsgId, targetQueue = "workflow_jobs") {
    try {
      const job = await this.dlq.peekOne(dlqMsgId);

      if (!job) {
        throw new Error(`Job ${dlqMsgId} not found in DLQ`);
      }

      const replayMessage = {
        ...job.message,
        attempt: 1,
        replayed_from_dlq: true,
        replayed_at: new Date().toISOString(),
        original_dlq_msg_id: dlqMsgId,
      };

      delete replayMessage.moved_to_dlq_at;
      delete replayMessage.error_message;
      delete replayMessage.error_stack;
      delete replayMessage.original_msg_id;

      const target =
        targetQueue === this.dlqName ? this.dlq : new Queue({ name: targetQueue, db: this.db });
      const newMsgId = await target.send(replayMessage, 0);

      await this.deleteDeadLetterJob(dlqMsgId);

      return { new_msg_id: newMsgId };
    } catch (error) {
      throw new Error(`Replay job failed: ${error.message}`);
    }
  }

  /**
   * Permanently drop a job from the DLQ.
   * @returns {Promise<boolean>}
   */
  async deleteDeadLetterJob(dlqMsgId) {
    try {
      return await this.dlq.deleteMessage(dlqMsgId);
    } catch (error) {
      throw new Error(`Delete DLQ job failed: ${error.message}`);
    }
  }

  /**
   * DLQ depth and message age.
   * @returns {Promise<Object>}
   */
  async getDLQMetrics() {
    try {
      return await this.dlq.metrics();
    } catch (error) {
      throw new Error(`Get DLQ metrics failed: ${error.message}`);
    }
  }

  /**
   * Empty the DLQ.
   * @returns {Promise<number>} Jobs removed.
   */
  async purgeDLQ() {
    try {
      return await this.dlq.purge();
    } catch (error) {
      throw new Error(`Purge DLQ failed: ${error.message}`);
    }
  }

  /**
   * Group DLQ jobs by their error message, for spotting a common root cause.
   * @returns {Promise<Object<string, Array>>}
   */
  async getJobsByErrorType() {
    try {
      const jobs = await this.listDeadLetterJobs(1000);

      return jobs.reduce((acc, job) => {
        const errorMsg = job.message.error_message || "Unknown error";
        if (!acc[errorMsg]) {
          acc[errorMsg] = [];
        }
        acc[errorMsg].push(job);
        return acc;
      }, {});
    } catch (error) {
      throw new Error(`Get jobs by error type failed: ${error.message}`);
    }
  }

  /**
   * Replay several jobs, continuing past individual failures.
   * @returns {Promise<{success:number, failed:number, errors:Array}>}
   */
  async replayMultipleJobs(dlqMsgIds, targetQueue = "workflow_jobs") {
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
   * Archive the original message from the main queue.
   *
   * The worker may already have archived it, so a miss is not an error.
   * @private
   */
  async _archiveOriginalJob(msgId) {
    try {
      await this.mainQueue.archive(msgId);
    } catch (error) {
      console.error("Failed to archive original job:", error.message);
    }
  }

  /**
   * Patch the job_tracking row for a message. Column names come from a fixed
   * allow-list so this cannot become arbitrary SQL.
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
 * @param {string} [dlqName] DLQ name.
 * @returns {DLQService}
 */
export function createDLQService(db, dlqName) {
  return new DLQService(db, dlqName);
}
