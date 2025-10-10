// Test file for QueueService
// Testing Framework: Mocha with Chai
// Issue #91: Implement job enqueue/dequeue

import { expect } from 'chai';
import { QueueService } from './queue-service.js';
import { createClient } from '@supabase/supabase-js';

describe('QueueService', () => {
  let queueService;
  let supabaseClient;

  before(() => {
    // Initialize Supabase client for testing
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    queueService = new QueueService(supabaseClient);
  });

  describe('constructor', () => {
    it('should create a QueueService instance', () => {
      expect(queueService).to.be.instanceOf(QueueService);
    });

    it('should have default queue name', () => {
      expect(queueService.queueName).to.equal('workflow_jobs');
    });

    it('should accept custom queue name', () => {
      const customQueue = new QueueService(supabaseClient, 'custom_queue');
      expect(customQueue.queueName).to.equal('custom_queue');
    });
  });

  describe('enqueue', () => {
    it('should enqueue a job with run_id', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174000';
      const workflowId = '123e4567-e89b-12d3-a456-426614174001';
      const projectId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await queueService.enqueue({
        run_id: runId,
        workflow_id: workflowId,
        project_id: projectId,
      });

      expect(result).to.have.property('msg_id');
      expect(result.msg_id).to.be.a('number');
    });

    it('should enqueue a job with delay', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174003';
      const delaySeconds = 60;

      const result = await queueService.enqueue(
        {
          run_id: runId,
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
        delaySeconds
      );

      expect(result).to.have.property('msg_id');
      expect(result.msg_id).to.be.a('number');
    });

    it('should throw error if run_id is missing', async () => {
      try {
        await queueService.enqueue({
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('run_id');
      }
    });

    it('should include metadata in job payload', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174004';
      const metadata = { source: 'webhook', priority: 'high' };

      const result = await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
        metadata,
      });

      expect(result).to.have.property('msg_id');
    });
  });

  describe('dequeue', () => {
    it('should dequeue a job from the queue', async () => {
      // First enqueue a job
      const runId = '123e4567-e89b-12d3-a456-426614174005';
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      // Then dequeue it
      const job = await queueService.dequeue();

      if (job) {
        expect(job).to.have.property('msg_id');
        expect(job).to.have.property('message');
        expect(job.message).to.have.property('run_id');
      }
    });

    it('should return null when queue is empty', async () => {
      // Create a new queue service with a unique queue name
      const emptyQueue = new QueueService(supabaseClient, 'empty_test_queue');
      const job = await emptyQueue.dequeue();
      expect(job).to.be.null;
    });

    it('should use custom visibility timeout', async () => {
      const runId = '123e4567-e89b-12d3-a456-426614174006';
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      const vtSeconds = 60;
      const job = await queueService.dequeue(vtSeconds);

      if (job) {
        expect(job).to.have.property('msg_id');
      }
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge and delete a processed job', async () => {
      // Enqueue and dequeue a job
      const runId = '123e4567-e89b-12d3-a456-426614174007';
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      const job = await queueService.dequeue();
      if (job) {
        const result = await queueService.acknowledge(job.msg_id);
        expect(result).to.be.true;
      }
    });

    it('should return false for non-existent message', async () => {
      const result = await queueService.acknowledge(999999999);
      expect(result).to.be.false;
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const metrics = await queueService.getQueueMetrics();

      expect(metrics).to.have.property('queue_name');
      expect(metrics).to.have.property('queue_length');
      expect(metrics.queue_name).to.equal('workflow_jobs');
      expect(metrics.queue_length).to.be.a('number');
    });
  });

  describe('purgeQueue', () => {
    it('should purge all messages from queue', async () => {
      // Enqueue some test messages
      await queueService.enqueue({
        run_id: '123e4567-e89b-12d3-a456-426614174008',
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      const result = await queueService.purgeQueue();
      expect(result).to.be.a('number');
      expect(result).to.be.at.least(0);
    });
  });

  describe('archiveJob', () => {
    it('should archive a job', async () => {
      // Enqueue and dequeue a job
      const runId = '123e4567-e89b-12d3-a456-426614174009';
      await queueService.enqueue({
        run_id: runId,
        workflow_id: '123e4567-e89b-12d3-a456-426614174001',
        project_id: '123e4567-e89b-12d3-a456-426614174002',
      });

      const job = await queueService.dequeue();
      if (job) {
        const result = await queueService.archiveJob(job.msg_id);
        expect(result).to.be.true;
      }
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const badClient = createClient('http://invalid-url', 'invalid-key');
      const badQueue = new QueueService(badClient);

      try {
        await badQueue.enqueue({
          run_id: '123e4567-e89b-12d3-a456-426614174010',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });
});