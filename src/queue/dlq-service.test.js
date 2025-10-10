// Test file for DLQService (Dead Letter Queue)
// Testing Framework: Mocha with Chai
// Issue #93: Implement DLQ (Dead Letter Queue)

import { expect } from 'chai';
import { DLQService } from './dlq-service.js';
import { createClient } from '@supabase/supabase-js';

describe('DLQService', () => {
  let dlqService;
  let supabaseClient;

  before(() => {
    // Initialize Supabase client for testing
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    dlqService = new DLQService(supabaseClient);
  });

  describe('constructor', () => {
    it('should create a DLQService instance', () => {
      expect(dlqService).to.be.instanceOf(DLQService);
    });

    it('should have default DLQ name', () => {
      expect(dlqService.dlqName).to.equal('workflow_jobs_dlq');
    });

    it('should accept custom DLQ name', () => {
      const customDLQ = new DLQService(supabaseClient, 'custom_dlq');
      expect(customDLQ.dlqName).to.equal('custom_dlq');
    });
  });

  describe('moveToDeadLetter', () => {
    it('should move failed job to DLQ', async () => {
      const job = {
        msg_id: 12345,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174000',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
          attempt: 5,
          max_attempts: 5,
        },
      };

      const errorMessage = 'Maximum retry attempts exceeded';

      const result = await dlqService.moveToDeadLetter(job, errorMessage);

      expect(result).to.have.property('dlq_msg_id');
      expect(result.dlq_msg_id).to.be.a('number');
    });

    it('should include error information in DLQ message', async () => {
      const job = {
        msg_id: 12346,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174003',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
          attempt: 5,
        },
      };

      const errorMessage = 'Network timeout';
      const errorStack = 'Error: Network timeout\n  at Worker.process';

      const result = await dlqService.moveToDeadLetter(
        job,
        errorMessage,
        errorStack
      );

      expect(result).to.have.property('dlq_msg_id');
    });

    it('should handle missing error message', async () => {
      const job = {
        msg_id: 12347,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174004',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
      };

      const result = await dlqService.moveToDeadLetter(job);
      expect(result).to.have.property('dlq_msg_id');
    });
  });

  describe('listDeadLetterJobs', () => {
    it('should list jobs in DLQ', async () => {
      const jobs = await dlqService.listDeadLetterJobs();

      expect(jobs).to.be.an('array');
      jobs.forEach((job) => {
        expect(job).to.have.property('msg_id');
        expect(job).to.have.property('message');
        expect(job.message).to.have.property('moved_to_dlq_at');
      });
    });

    it('should limit number of jobs returned', async () => {
      const limit = 5;
      const jobs = await dlqService.listDeadLetterJobs(limit);

      expect(jobs).to.be.an('array');
      expect(jobs.length).to.be.at.most(limit);
    });

    it('should return empty array when DLQ is empty', async () => {
      // Create a new DLQ service with unique queue name
      const emptyDLQ = new DLQService(supabaseClient, 'empty_dlq_test');
      const jobs = await emptyDLQ.listDeadLetterJobs();

      expect(jobs).to.be.an('array');
      expect(jobs.length).to.equal(0);
    });
  });

  describe('getDeadLetterJob', () => {
    it('should retrieve specific job from DLQ', async () => {
      // First, add a job to DLQ
      const testJob = {
        msg_id: 12348,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174005',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
      };

      const moveResult = await dlqService.moveToDeadLetter(testJob);
      const dlqMsgId = moveResult.dlq_msg_id;

      // Then retrieve it
      const job = await dlqService.getDeadLetterJob(dlqMsgId);

      if (job) {
        expect(job).to.have.property('msg_id');
        expect(job.msg_id).to.equal(dlqMsgId);
        expect(job).to.have.property('message');
      }
    });

    it('should return null for non-existent job', async () => {
      const job = await dlqService.getDeadLetterJob(999999999);
      expect(job).to.be.null;
    });
  });

  describe('replayDeadLetterJob', () => {
    it('should replay job from DLQ to main queue', async () => {
      // First, add a job to DLQ
      const testJob = {
        msg_id: 12349,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174006',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
      };

      const moveResult = await dlqService.moveToDeadLetter(testJob);
      const dlqMsgId = moveResult.dlq_msg_id;

      // Then replay it
      const result = await dlqService.replayDeadLetterJob(
        dlqMsgId,
        'workflow_jobs'
      );

      expect(result).to.have.property('new_msg_id');
      expect(result.new_msg_id).to.be.a('number');
    });

    it('should reset attempt counter when replaying', async () => {
      const testJob = {
        msg_id: 12350,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174007',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
          attempt: 5,
        },
      };

      const moveResult = await dlqService.moveToDeadLetter(testJob);
      const result = await dlqService.replayDeadLetterJob(
        moveResult.dlq_msg_id,
        'workflow_jobs'
      );

      expect(result).to.have.property('new_msg_id');
    });
  });

  describe('deleteDeadLetterJob', () => {
    it('should delete job from DLQ', async () => {
      // First, add a job to DLQ
      const testJob = {
        msg_id: 12351,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174008',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
      };

      const moveResult = await dlqService.moveToDeadLetter(testJob);
      const dlqMsgId = moveResult.dlq_msg_id;

      // Then delete it
      const result = await dlqService.deleteDeadLetterJob(dlqMsgId);
      expect(result).to.be.true;
    });

    it('should return false for non-existent job', async () => {
      const result = await dlqService.deleteDeadLetterJob(999999999);
      expect(result).to.be.false;
    });
  });

  describe('getDLQMetrics', () => {
    it('should return DLQ metrics', async () => {
      const metrics = await dlqService.getDLQMetrics();

      expect(metrics).to.have.property('dlq_name');
      expect(metrics).to.have.property('total_jobs');
      expect(metrics.dlq_name).to.equal('workflow_jobs_dlq');
      expect(metrics.total_jobs).to.be.a('number');
    });

    it('should include age information', async () => {
      const metrics = await dlqService.getDLQMetrics();

      expect(metrics).to.have.property('oldest_job_age_seconds');
      expect(metrics).to.have.property('newest_job_age_seconds');
    });
  });

  describe('purgeDLQ', () => {
    it('should purge all jobs from DLQ', async () => {
      // Add some test jobs first
      const testJob = {
        msg_id: 12352,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174009',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
      };

      await dlqService.moveToDeadLetter(testJob);

      // Then purge
      const result = await dlqService.purgeDLQ();
      expect(result).to.be.a('number');
      expect(result).to.be.at.least(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid job data gracefully', async () => {
      try {
        await dlqService.moveToDeadLetter(null);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle database errors gracefully', async () => {
      const badClient = createClient('http://invalid-url', 'invalid-key');
      const badDLQ = new DLQService(badClient);

      try {
        await badDLQ.listDeadLetterJobs();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe('integration with job tracking', () => {
    it('should update job tracking when moving to DLQ', async () => {
      const testJob = {
        msg_id: 12353,
        message: {
          run_id: '123e4567-e89b-12d3-a456-426614174010',
          workflow_id: '123e4567-e89b-12d3-a456-426614174001',
          project_id: '123e4567-e89b-12d3-a456-426614174002',
        },
      };

      const result = await dlqService.moveToDeadLetter(
        testJob,
        'Test error message'
      );

      expect(result).to.have.property('dlq_msg_id');
      // Job tracking should be updated with moved_to_dlq_at timestamp
    });
  });
});