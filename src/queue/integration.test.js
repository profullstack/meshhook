// Queue system integration tests.
//
// Exercises QueueService, DLQService, RetryStrategy and Worker together against
// a real in-memory libSQL database. The previous version of this file required
// a running Supabase stack on localhost:54321 and was skipped in practice.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueueService, DLQService, RetryStrategy, Worker } from "./index.js";
import { createTestDb, seedRun, jobFor } from "./test-helpers.js";

describe("Queue system integration", () => {
  let db;
  let queueService;
  let dlqService;
  let seed;

  beforeEach(async () => {
    db = await createTestDb();
    queueService = new QueueService(db);
    dlqService = new DLQService(db);
    seed = await seedRun(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("happy path", () => {
    it("carries a job from enqueue through acknowledgement", async () => {
      const { msg_id } = await queueService.enqueue(jobFor(seed));

      const job = await queueService.dequeue();
      expect(job.msg_id).toBe(msg_id);

      expect(await queueService.acknowledge(msg_id)).toBe(true);
      expect(await queueService.queue.size()).toBe(0);

      const tracking = await db.one("select * from job_tracking where msg_id = ?", [msg_id]);
      expect(tracking.started_at).toBeTruthy();
      expect(tracking.completed_at).toBeTruthy();
    });
  });

  describe("retry then dead-letter", () => {
    it("retries up to the limit, then moves the job to the DLQ", async () => {
      const retryStrategy = new RetryStrategy({ baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3 });

      await queueService.enqueue(jobFor(seed, { max_attempts: 3 }));

      let attempts = 0;
      let lastJob = null;

      // Each pass leases the job, "fails", and requeues it immediately.
      for (let i = 0; i < 3; i++) {
        const job = await queueService.dequeue(30);
        expect(job).not.toBeNull();
        attempts++;
        lastJob = job;

        if (retryStrategy.canRetry(attempts)) {
          await queueService.requeue(job.msg_id, 0);
        }
      }

      expect(attempts).toBe(3);
      expect(retryStrategy.canRetry(attempts)).toBe(false);

      const { dlq_msg_id } = await dlqService.moveToDeadLetter(lastJob, "exhausted retries");

      expect(await queueService.queue.size()).toBe(0);
      const dead = await dlqService.getDeadLetterJob(dlq_msg_id);
      expect(dead.message.error_message).toBe("exhausted retries");
      expect(dead.message.read_count).toBe(3);
    });

    it("replays a dead-lettered job back onto the main queue", async () => {
      await queueService.enqueue(jobFor(seed));
      const job = await queueService.dequeue();
      const { dlq_msg_id } = await dlqService.moveToDeadLetter(job, "downstream 500");

      await dlqService.replayDeadLetterJob(dlq_msg_id);

      const replayed = await queueService.dequeue();
      expect(replayed.message.run_id).toBe(seed.runId);
      expect(replayed.message.attempt).toBe(1);
    });
  });

  describe("concurrent consumers", () => {
    it("never hands the same message to two readers", async () => {
      for (let i = 0; i < 10; i++) {
        await queueService.enqueue(jobFor(seed, { metadata: { n: i } }));
      }

      const consumers = Array.from({ length: 4 }, () => new QueueService(db));
      const claimed = [];

      // Drain the queue from several consumers; a lease must be exclusive.
      let job;
      do {
        const results = await Promise.all(consumers.map((c) => c.dequeue(30)));
        const found = results.filter(Boolean);
        claimed.push(...found.map((j) => j.msg_id));
        job = found.length > 0 ? found[0] : null;
      } while (job);

      expect(claimed).toHaveLength(10);
      expect(new Set(claimed).size).toBe(10);
    });
  });

  describe("Worker", () => {
    it("requires a job handler", () => {
      expect(() => new Worker({ db })).toThrow(/Job handler function is required/);
    });

    it("processes a job and acknowledges it", async () => {
      const handled = [];

      const worker = new Worker({
        db,
        pollIntervalMs: 5,
        jobHandler: async (message) => {
          handled.push(message);
        },
      });

      await queueService.enqueue(jobFor(seed));
      await worker.start();

      // Give the poll loop room to pick the job up.
      await waitFor(() => handled.length === 1);
      await worker.stop();

      expect(handled[0].run_id).toBe(seed.runId);
      expect(await queueService.queue.size()).toBe(0);
      expect(worker.stats.succeeded).toBe(1);
    });

    it("does not acknowledge a job whose handler throws", async () => {
      const worker = new Worker({
        db,
        pollIntervalMs: 5,
        retryConfig: { baseDelayMs: 1, maxDelayMs: 2 },
        jobHandler: async () => {
          throw new Error("handler exploded");
        },
      });

      await queueService.enqueue(jobFor(seed));
      await worker.start();

      await waitFor(() => worker.stats.failed > 0 || worker.stats.retried > 0);
      await worker.stop();

      // The message must survive for redelivery rather than being dropped.
      const tracking = await db.one("select * from job_tracking where run_id = ?", [seed.runId]);
      expect(tracking.completed_at).toBeNull();
    });
  });
});

/** Poll `predicate` until it holds or the timeout lapses. */
async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for condition");
}
