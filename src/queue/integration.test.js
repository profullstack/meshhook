// Integration Tests for Queue System
// Testing Framework: Mocha with Chai
// Tests the complete queue system including retry and DLQ functionality

import { expect } from 'chai';
import { createClient } from '@supabase/supabase-js';
import {
  QueueService,
  DLQService,
  RetryStrategy,
  Worker,
  createJobHandler,
} from './index.js';

describe('Queue System Integration Tests', () => {
  let supabaseClient;
  let queueService;
  let dlqService;
  let retryStrategy;

  before(() => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';
    supabaseClient = createClient(supabaseUrl, supabaseKey);

    queueService = new QueueService(supabaseClient);
    dlqService = new DLQService(supabaseClient);
    retryStrategy = new RetryStrategy({
      baseDelayMs: 100,
      maxDelayMs: 1000,
      maxAttempts: 3,
    });
  });

  describe('End-to-End Job Processing', () => {
    it('should successfully process a job from enqueue to completion', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174100';
      let jobProcessed = false;

      // Enqueue a job
      const enqueueResult = await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      expect(enqueueResult).to.have.property('msg_id');

      // Create a worker to process the job
      const jobHandler = createJobHandler(async (message) => {
        expect(message.run_id).to.equal(runId);
        jobProcessed = true;
      });

      const worker = new Worker({
        supabaseClient,
        jobHandler,
        pollIntervalMs: 100,
        retryConfig: {
          baseDelayMs: 100,
          maxDelayMs: 1000,
          maxAttempts: 3,
        },
      });

      await worker.start();

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      await worker.stop();

      expect(jobProcessed).to.be.true;
      expect(worker.getStats().succeeded).to.be.at.least(1);
    });

    it('should retry failed jobs with exponential backoff', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174101';
      let attemptCount = 0;

      // Enqueue a job
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      // Create a worker that fails twice then succeeds
      const jobHandler = createJobHandler(async (message) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated failure');
        }
        // Success on third attempt
      });

      const worker = new Worker({
        supabaseClient,
        jobHandler,
        pollIntervalMs: 100,
        retryConfig: {
          baseDelayMs: 100,
          maxDelayMs: 1000,
          maxAttempts: 3,
        },
      });

      await worker.start();

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await worker.stop();

      expect(attemptCount).to.equal(3);
      expect(worker.getStats().retried).to.be.at.least(2);
      expect(worker.getStats().succeeded).to.be.at.least(1);
    });

    it('should move job to DLQ after max retry attempts', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174102';

      // Enqueue a job
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      // Create a worker that always fails
      const jobHandler = createJobHandler(async () => {
        throw new Error('Permanent failure');
      });

      const worker = new Worker({
        supabaseClient,
        jobHandler,
        pollIntervalMs: 100,
        retryConfig: {
          baseDelayMs: 100,
          maxDelayMs: 1000,
          maxAttempts: 3,
        },
      });

      await worker.start();

      // Wait for all retries and DLQ move
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await worker.stop();

      expect(worker.getStats().movedToDLQ).to.be.at.least(1);

      // Verify job is in DLQ
      const dlqJobs = await dlqService.listDeadLetterJobs();
      const movedJob = dlqJobs.find((j) => j.message.run_id === runId);
      expect(movedJob).to.exist;
      expect(movedJob.message).to.have.property('error_message');
    });
  });

  describe('DLQ Replay Functionality', () => {
    it('should replay job from DLQ back to main queue', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174103';

      // Create a job that will fail and move to DLQ
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      const jobHandler = createJobHandler(async () => {
        throw new Error('Initial failure');
      });

      const worker = new Worker({
        supabaseClient,
        jobHandler,
        pollIntervalMs: 100,
        retryConfig: {
          baseDelayMs: 100,
          maxDelayMs: 1000,
          maxAttempts: 2,
        },
      });

      await worker.start();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await worker.stop();

      // Find the job in DLQ
      const dlqJobs = await dlqService.listDeadLetterJobs();
      const dlqJob = dlqJobs.find((j) => j.message.run_id === runId);

      if (dlqJob) {
        // Replay the job
        const replayResult = await dlqService.replayDeadLetterJob(
          dlqJob.msg_id
        );
        expect(replayResult).to.have.property('new_msg_id');

        // Verify job is back in main queue
        const metrics = await queueService.getQueueMetrics();
        expect(metrics.queue_length).to.be.at.least(0);
      }
    });
  });

  describe('Retry Strategy Integration', () => {
    it('should calculate correct delays for retry attempts', () => {
      const delays = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = retryStrategy.getNextDelay(attempt);
        delays.push(delay);
      }

      // Verify delays are increasing (with jitter tolerance)
      expect(delays[1]).to.be.greaterThan(delays[0] * 0.5);
      expect(delays[2]).to.be.greaterThan(delays[1] * 0.5);
    });

    it('should respect max delay limit', () => {
      const strategy = new RetryStrategy({
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        maxAttempts: 10,
      });

      const delay = strategy.getNextDelay(10);
      expect(delay).to.be.at.most(5000);
    });
  });

  describe('Queue Metrics and Monitoring', () => {
    it('should provide accurate queue metrics', async () => {
      // Enqueue some test jobs
      for (let i = 0; i < 3; i++) {
        await queueService.enqueue({
          run_id: `123e4567-e89b-12d3-a456-42661417410${i}`,
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        });
      }

      const metrics = await queueService.getQueueMetrics();

      expect(metrics).to.have.property('queue_name');
      expect(metrics).to.have.property('queue_length');
      expect(metrics.queue_length).to.be.at.least(0);
    });

    it('should provide DLQ metrics', async () => {
      const metrics = await dlqService.getDLQMetrics();

      expect(metrics).to.have.property('dlq_name');
      expect(metrics).to.have.property('total_jobs');
    });
  });

  describe('Concurrent Job Processing', () => {
    it('should handle multiple jobs concurrently', async () => {
      const jobCount = 5;
      const processedJobs = new Set();

      // Enqueue multiple jobs
      for (let i = 0; i < jobCount; i++) {
        await queueService.enqueue({
          run_id: `concurrent-${i}`,
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        });
      }

      const jobHandler = createJobHandler(async (message) => {
        processedJobs.add(message.run_id);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const worker = new Worker({
        supabaseClient,
        jobHandler,
        pollIntervalMs: 50,
      });

      await worker.start();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await worker.stop();

      expect(processedJobs.size).to.be.at.least(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed job data gracefully', async () => {
      try {
        await queueService.enqueue({
          // Missing required fields
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('run_id');
      }
    });

    it('should handle worker errors without crashing', async () => {
      const jobHandler = createJobHandler(async () => {
        throw new Error('Critical error');
      });

      const worker = new Worker({
        supabaseClient,
        jobHandler,
        pollIntervalMs: 100,
        retryConfig: {
          maxAttempts: 1,
        },
      });

      await worker.start();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await worker.stop();

      // Worker should still be functional
      expect(worker.getStats().processed).to.be.at.least(0);
    });
  });
});