// QueueService tests — run against a real in-memory libSQL database.
// Issue #91: Implement job enqueue/dequeue

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueueService } from "./queue-service.js";
import { createTestDb, seedRun, jobFor } from "./test-helpers.js";

describe("QueueService", () => {
  let db;
  let queueService;
  let seed;

  beforeEach(async () => {
    db = await createTestDb();
    queueService = new QueueService(db);
    seed = await seedRun(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("constructor", () => {
    it("uses workflow_jobs by default", () => {
      expect(queueService.queueName).toBe("workflow_jobs");
    });

    it("accepts a custom queue name", () => {
      expect(new QueueService(db, "custom_queue").queueName).toBe("custom_queue");
    });

    it("rejects a missing database handle", () => {
      expect(() => new QueueService(null)).toThrow(/Database handle is required/);
    });
  });

  describe("enqueue", () => {
    it("returns a message id", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));
      expect(msg_id).toBeTypeOf("number");
      expect(msg_id).toBeGreaterThan(0);
    });

    it("records the job in job_tracking", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed, { max_attempts: 3 }));

      const row = await db.one("select * from job_tracking where msg_id = ?", [msg_id]);
      expect(row.run_id).toBe(seed.runId);
      expect(row.queue_name).toBe("workflow_jobs");
      expect(row.attempt).toBe(1);
      expect(row.max_attempts).toBe(3);
    });

    it.each(["run_id", "workflow_id", "project_id"])("requires %s", async (field) => {
      const job = jobFor(seed);
      delete job[field];
      await expect(queueService.enqueue(job)).rejects.toThrow(new RegExp(field));
    });

    it("hides a delayed job until its delay elapses", async () => {
      await queueService.enqueue(jobFor(seed), 60);
      expect(await queueService.dequeue()).toBeNull();
    });
  });

  describe("dequeue", () => {
    it("returns null on an empty queue", async () => {
      expect(await queueService.dequeue()).toBeNull();
    });

    it("returns the enqueued payload", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));
      const job = await queueService.dequeue();

      expect(job.msg_id).toBe(msg_id);
      expect(job.message.run_id).toBe(seed.runId);
      expect(job.read_ct).toBe(1);
    });

    it("hides a leased job from the next reader", async () => {
      await queueService.enqueue(jobFor(seed));
      await queueService.dequeue(30);
      expect(await queueService.dequeue(30)).toBeNull();
    });

    it("redelivers once the visibility timeout lapses", async () => {
      await queueService.enqueue(jobFor(seed));
      // A zero-second lease expires immediately, standing in for a dead worker.
      const first = await queueService.dequeue(0);
      const second = await queueService.dequeue(30);

      expect(second).not.toBeNull();
      expect(second.msg_id).toBe(first.msg_id);
      expect(second.read_ct).toBe(2);
    });

    it("serves messages in FIFO order", async () => {
      const a = await queueService.enqueue(jobFor(seed, { metadata: { n: 1 } }));
      const b = await queueService.enqueue(jobFor(seed, { metadata: { n: 2 } }));

      expect((await queueService.dequeue()).msg_id).toBe(a.msg_id);
      expect((await queueService.dequeue()).msg_id).toBe(b.msg_id);
    });

    it("stamps started_at on the tracking row", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));
      await queueService.dequeue();

      const row = await db.one("select started_at from job_tracking where msg_id = ?", [msg_id]);
      expect(row.started_at).toBeTruthy();
    });
  });

  describe("acknowledge", () => {
    it("removes the message and stamps completed_at", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));
      await queueService.dequeue();

      expect(await queueService.acknowledge(msg_id)).toBe(true);
      expect(await queueService.queue.size()).toBe(0);

      const row = await db.one("select completed_at from job_tracking where msg_id = ?", [msg_id]);
      expect(row.completed_at).toBeTruthy();
    });

    it("reports false for an unknown message", async () => {
      expect(await queueService.acknowledge(999999)).toBe(false);
    });
  });

  describe("archiveJob", () => {
    it("moves the message to queue_archive keeping its id", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));

      expect(await queueService.archiveJob(msg_id)).toBe(true);
      expect(await queueService.queue.size()).toBe(0);

      const archived = await db.one("select * from queue_archive where msg_id = ?", [msg_id]);
      expect(archived.queue_name).toBe("workflow_jobs");
    });

    it("reports false for an unknown message", async () => {
      expect(await queueService.archiveJob(999999)).toBe(false);
    });
  });

  describe("requeue", () => {
    it("makes a leased job immediately visible again", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));
      await queueService.dequeue(300);

      expect(await queueService.dequeue()).toBeNull();
      await queueService.requeue(msg_id, 0);

      const job = await queueService.dequeue();
      expect(job?.msg_id).toBe(msg_id);
    });
  });

  describe("getQueueMetrics", () => {
    it("reports zero for an empty queue", async () => {
      const metrics = await queueService.getQueueMetrics();
      expect(metrics.queue_length).toBe(0);
      expect(metrics.oldest_msg_age_seconds).toBeNull();
    });

    it("counts only visible messages", async () => {
      await queueService.enqueue(jobFor(seed));
      await queueService.enqueue(jobFor(seed));
      await queueService.enqueue(jobFor(seed), 60); // still invisible

      const metrics = await queueService.getQueueMetrics();
      expect(metrics.queue_length).toBe(2);
      expect(metrics.oldest_msg_age_seconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe("purgeQueue", () => {
    it("removes every message and returns the count", async () => {
      await queueService.enqueue(jobFor(seed));
      await queueService.enqueue(jobFor(seed));

      expect(await queueService.purgeQueue()).toBe(2);
      expect(await queueService.queue.size()).toBe(0);
    });

    it("leaves other queues alone", async () => {
      const other = new QueueService(db, "other_queue");
      await queueService.enqueue(jobFor(seed));
      await other.enqueue(jobFor(seed));

      await queueService.purgeQueue();
      expect(await other.queue.size()).toBe(1);
    });
  });
});
