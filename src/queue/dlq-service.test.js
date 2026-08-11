// DLQService tests — run against a real in-memory libSQL database.
// Issue #92: Implement dead letter queue

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueueService } from "./queue-service.js";
import { DLQService } from "./dlq-service.js";
import { createTestDb, seedRun, jobFor } from "./test-helpers.js";

describe("DLQService", () => {
  let db;
  let queueService;
  let dlqService;
  let seed;

  /** Enqueue a job, lease it, and hand back the leased job object. */
  async function leaseJob() {
    await queueService.enqueue(jobFor(seed));
    return queueService.dequeue();
  }

  beforeEach(async () => {
    db = await createTestDb();
    queueService = new QueueService(db);
    dlqService = new DLQService(db);
    seed = await seedRun(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("constructor", () => {
    it("defaults to workflow_jobs_dlq", () => {
      expect(dlqService.dlqName).toBe("workflow_jobs_dlq");
    });

    it("rejects a missing database handle", () => {
      expect(() => new DLQService(null)).toThrow(/Database handle is required/);
    });
  });

  describe("moveToDeadLetter", () => {
    it("rejects an invalid job", async () => {
      await expect(dlqService.moveToDeadLetter(null)).rejects.toThrow(/Invalid job object/);
      await expect(dlqService.moveToDeadLetter({})).rejects.toThrow(/Invalid job object/);
    });

    it("attaches the failure metadata", async () => {
      const job = await leaseJob();
      const { dlq_msg_id } = await dlqService.moveToDeadLetter(job, "boom", "at foo()");

      const dead = await dlqService.getDeadLetterJob(dlq_msg_id);
      expect(dead.message.error_message).toBe("boom");
      expect(dead.message.error_stack).toBe("at foo()");
      expect(dead.message.original_msg_id).toBe(job.msg_id);
      expect(dead.message.run_id).toBe(seed.runId);
    });

    it("defaults the error message when none is given", async () => {
      const job = await leaseJob();
      const { dlq_msg_id } = await dlqService.moveToDeadLetter(job);

      const dead = await dlqService.getDeadLetterJob(dlq_msg_id);
      expect(dead.message.error_message).toBe("Unknown error");
    });

    it("archives the original message off the main queue", async () => {
      const job = await leaseJob();
      await dlqService.moveToDeadLetter(job, "boom");

      expect(await queueService.queue.size()).toBe(0);
      const archived = await db.oneOrNone("select * from queue_archive where msg_id = ?", [
        job.msg_id,
      ]);
      expect(archived).not.toBeNull();
    });

    it("stamps moved_to_dlq_at on the tracking row", async () => {
      const job = await leaseJob();
      await dlqService.moveToDeadLetter(job, "boom");

      const row = await db.one("select * from job_tracking where msg_id = ?", [job.msg_id]);
      expect(row.moved_to_dlq_at).toBeTruthy();
      expect(row.error_message).toBe("boom");
    });
  });

  describe("listDeadLetterJobs", () => {
    it("returns an empty list when the DLQ is empty", async () => {
      expect(await dlqService.listDeadLetterJobs()).toEqual([]);
    });

    it("does not lease the jobs it lists", async () => {
      const job = await leaseJob();
      await dlqService.moveToDeadLetter(job, "boom");

      await dlqService.listDeadLetterJobs();
      const [again] = await dlqService.listDeadLetterJobs();

      // Browsing used to increment read_ct via pgmq_read(vt=0); it must not.
      expect(again.read_ct).toBe(0);
    });

    it("honours the limit", async () => {
      for (let i = 0; i < 3; i++) {
        await dlqService.moveToDeadLetter(await leaseJob(), `err-${i}`);
      }
      expect(await dlqService.listDeadLetterJobs(2)).toHaveLength(2);
    });
  });

  describe("getDeadLetterJob", () => {
    it("returns null for an unknown id", async () => {
      expect(await dlqService.getDeadLetterJob(999999)).toBeNull();
    });

    it("finds a job beyond the first page", async () => {
      let last;
      for (let i = 0; i < 5; i++) {
        last = await dlqService.moveToDeadLetter(await leaseJob(), `err-${i}`);
      }
      // The Postgres version paged through results and could miss this.
      const found = await dlqService.getDeadLetterJob(last.dlq_msg_id);
      expect(found?.msg_id).toBe(last.dlq_msg_id);
    });
  });

  describe("replayDeadLetterJob", () => {
    it("puts the job back on the main queue and clears the DLQ entry", async () => {
      const job = await leaseJob();
      const { dlq_msg_id } = await dlqService.moveToDeadLetter(job, "boom");

      const { new_msg_id } = await dlqService.replayDeadLetterJob(dlq_msg_id);

      expect(new_msg_id).toBeTypeOf("number");
      expect(await dlqService.getDeadLetterJob(dlq_msg_id)).toBeNull();

      const replayed = await queueService.dequeue();
      expect(replayed.msg_id).toBe(new_msg_id);
      expect(replayed.message.run_id).toBe(seed.runId);
    });

    it("resets the attempt counter and strips failure metadata", async () => {
      await queueService.enqueue(jobFor(seed, { attempt: 5 }));
      const job = await queueService.dequeue();
      const { dlq_msg_id } = await dlqService.moveToDeadLetter(job, "boom", "stack");

      await dlqService.replayDeadLetterJob(dlq_msg_id);
      const replayed = await queueService.dequeue();

      expect(replayed.message.attempt).toBe(1);
      expect(replayed.message.replayed_from_dlq).toBe(true);
      expect(replayed.message.error_message).toBeUndefined();
      expect(replayed.message.error_stack).toBeUndefined();
      expect(replayed.message.moved_to_dlq_at).toBeUndefined();
    });

    it("throws for an unknown id", async () => {
      await expect(dlqService.replayDeadLetterJob(999999)).rejects.toThrow(/not found in DLQ/);
    });
  });

  describe("replayMultipleJobs", () => {
    it("counts successes and failures separately", async () => {
      const ids = [];
      for (let i = 0; i < 2; i++) {
        const { dlq_msg_id } = await dlqService.moveToDeadLetter(await leaseJob(), `err-${i}`);
        ids.push(dlq_msg_id);
      }

      const result = await dlqService.replayMultipleJobs([...ids, 999999]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0].msg_id).toBe(999999);
    });
  });

  describe("getJobsByErrorType", () => {
    it("groups jobs by their error message", async () => {
      await dlqService.moveToDeadLetter(await leaseJob(), "timeout");
      await dlqService.moveToDeadLetter(await leaseJob(), "timeout");
      await dlqService.moveToDeadLetter(await leaseJob(), "bad gateway");

      const grouped = await dlqService.getJobsByErrorType();

      expect(Object.keys(grouped).sort()).toEqual(["bad gateway", "timeout"]);
      expect(grouped.timeout).toHaveLength(2);
    });
  });

  describe("purgeDLQ", () => {
    it("empties the DLQ without touching the main queue", async () => {
      await dlqService.moveToDeadLetter(await leaseJob(), "boom");
      await queueService.enqueue(jobFor(seed));

      expect(await dlqService.purgeDLQ()).toBe(1);
      expect(await dlqService.listDeadLetterJobs()).toEqual([]);
      expect(await queueService.queue.size()).toBe(1);
    });
  });

  describe("getDLQMetrics", () => {
    it("reports the DLQ depth", async () => {
      await dlqService.moveToDeadLetter(await leaseJob(), "boom");

      const metrics = await dlqService.getDLQMetrics();
      expect(metrics.queue_name).toBe("workflow_jobs_dlq");
      expect(metrics.queue_length).toBe(1);
    });
  });
});
