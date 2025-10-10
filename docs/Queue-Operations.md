# Queue Operations Guide

Complete guide for operating and managing the MeshHook PGMQ queue system.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Queue Service](#queue-service)
- [Worker Operations](#worker-operations)
- [Retry Logic](#retry-logic)
- [Dead Letter Queue (DLQ)](#dead-letter-queue-dlq)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The MeshHook queue system uses PGMQ (PostgreSQL Message Queue) to manage workflow job execution with:

- **Reliable job processing** with visibility timeouts
- **Automatic retries** with exponential backoff and jitter
- **Dead letter queue** for failed jobs
- **Job tracking** and monitoring
- **Horizontal scalability** via multiple workers

## Installation

### Prerequisites

- Node.js 20+
- PostgreSQL with PGMQ extension
- Supabase client

### Install Dependencies

```bash
pnpm add @supabase/supabase-js
```

### Run Migration

```bash
# Apply PGMQ setup migration
pnpm run db:migrate
```

## Basic Usage

### Initialize Services

```javascript
import { createClient } from '@supabase/supabase-js';
import { QueueService, Worker, createJobHandler } from './src/queue/index.js';

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Create queue service
const queueService = new QueueService(supabase);
```

### Enqueue a Job

```javascript
// Enqueue a workflow job
const result = await queueService.enqueue({
  run_id: 'uuid-here',
  workflow_id: 'workflow-uuid',
  project_id: 'project-uuid',
  metadata: {
    source: 'webhook',
    priority: 'high',
  },
});

console.log('Job enqueued:', result.msg_id);
```

### Enqueue with Delay

```javascript
// Schedule job to run in 60 seconds
const result = await queueService.enqueue(
  {
    run_id: 'uuid-here',
    workflow_id: 'workflow-uuid',
    project_id: 'project-uuid',
  },
  60 // delay in seconds
);
```

## Queue Service

### QueueService API

#### `enqueue(jobData, delaySeconds)`

Enqueue a job to the queue.

```javascript
const result = await queueService.enqueue(
  {
    run_id: 'required-uuid',
    workflow_id: 'required-uuid',
    project_id: 'required-uuid',
    attempt: 1, // optional, default: 1
    max_attempts: 5, // optional, default: 5
    metadata: {}, // optional
  },
  0 // optional delay in seconds
);
```

#### `dequeue(vtSeconds)`

Dequeue a job from the queue.

```javascript
const job = await queueService.dequeue(30); // 30 second visibility timeout

if (job) {
  console.log('Processing job:', job.msg_id);
  // Process the job
  await processJob(job.message);
  // Acknowledge completion
  await queueService.acknowledge(job.msg_id);
}
```

#### `acknowledge(msgId)`

Acknowledge and delete a processed job.

```javascript
const success = await queueService.acknowledge(msgId);
```

#### `getQueueMetrics()`

Get queue metrics.

```javascript
const metrics = await queueService.getQueueMetrics();
console.log('Queue length:', metrics.queue_length);
console.log('Oldest job age:', metrics.oldest_msg_age_seconds);
```

## Worker Operations

### Create and Start a Worker

```javascript
import { Worker, createJobHandler } from './src/queue/index.js';

// Define job handler
const jobHandler = createJobHandler(async (message) => {
  console.log('Processing job:', message.run_id);
  
  // Your job processing logic here
  await executeWorkflow(message);
  
  console.log('Job completed:', message.run_id);
});

// Create worker
const worker = new Worker({
  supabaseClient: supabase,
  jobHandler,
  queueName: 'workflow_jobs',
  pollIntervalMs: 1000, // Poll every second
  visibilityTimeoutSeconds: 30,
  retryConfig: {
    baseDelayMs: 1000,
    maxDelayMs: 300000, // 5 minutes
    maxAttempts: 5,
  },
});

// Start worker
await worker.start();
console.log('Worker started');

// Stop worker gracefully
process.on('SIGTERM', async () => {
  console.log('Stopping worker...');
  await worker.stop();
  process.exit(0);
});
```

### Worker Statistics

```javascript
const stats = worker.getStats();
console.log('Processed:', stats.processed);
console.log('Succeeded:', stats.succeeded);
console.log('Failed:', stats.failed);
console.log('Retried:', stats.retried);
console.log('Moved to DLQ:', stats.movedToDLQ);
```

### Multiple Workers

Run multiple workers for horizontal scaling:

```javascript
// worker1.js
const worker1 = new Worker({ supabaseClient, jobHandler });
await worker1.start();

// worker2.js
const worker2 = new Worker({ supabaseClient, jobHandler });
await worker2.start();
```

## Retry Logic

### Retry Strategy

The retry strategy uses exponential backoff with jitter:

```javascript
import { RetryStrategy } from './src/queue/index.js';

const retryStrategy = new RetryStrategy({
  baseDelayMs: 1000, // Start with 1 second
  maxDelayMs: 300000, // Cap at 5 minutes
  maxAttempts: 5, // Max 5 attempts
});

// Get retry information
const info = retryStrategy.getRetryInfo(3);
console.log('Attempt:', info.attempt);
console.log('Can retry:', info.canRetry);
console.log('Delay:', info.delaySeconds, 'seconds');
console.log('Should move to DLQ:', info.shouldMoveToDeadLetter);
```

### Retry Delays

Example retry delays with exponential backoff:

| Attempt | Base Delay | Actual Delay (with jitter) |
|---------|------------|----------------------------|
| 1       | 1s         | 1-2s                       |
| 2       | 2s         | 2-4s                       |
| 3       | 4s         | 4-8s                       |
| 4       | 8s         | 8-16s                      |
| 5       | 16s        | 16-32s                     |

### Custom Retry Configuration

```javascript
const worker = new Worker({
  supabaseClient,
  jobHandler,
  retryConfig: {
    baseDelayMs: 2000, // Start with 2 seconds
    maxDelayMs: 60000, // Cap at 1 minute
    maxAttempts: 3, // Only 3 attempts
  },
});
```

## Dead Letter Queue (DLQ)

### DLQService API

```javascript
import { DLQService } from './src/queue/index.js';

const dlqService = new DLQService(supabase);
```

### List DLQ Jobs

```javascript
const dlqJobs = await dlqService.listDeadLetterJobs(100);

dlqJobs.forEach((job) => {
  console.log('Failed job:', job.msg_id);
  console.log('Error:', job.message.error_message);
  console.log('Moved at:', job.message.moved_to_dlq_at);
});
```

### Get Specific DLQ Job

```javascript
const job = await dlqService.getDeadLetterJob(msgId);
if (job) {
  console.log('Job details:', job.message);
}
```

### Replay DLQ Job

```javascript
// Replay a single job
const result = await dlqService.replayDeadLetterJob(msgId);
console.log('Replayed with new msg_id:', result.new_msg_id);

// Replay multiple jobs
const results = await dlqService.replayMultipleJobs([msgId1, msgId2, msgId3]);
console.log('Success:', results.success);
console.log('Failed:', results.failed);
```

### Delete DLQ Job

```javascript
const deleted = await dlqService.deleteDeadLetterJob(msgId);
```

### Get DLQ Metrics

```javascript
const metrics = await dlqService.getDLQMetrics();
console.log('Total DLQ jobs:', metrics.total_jobs);
console.log('Oldest job age:', metrics.oldest_job_age_seconds);
```

### Group by Error Type

```javascript
const grouped = await dlqService.getJobsByErrorType();

Object.entries(grouped).forEach(([error, jobs]) => {
  console.log(`Error: ${error}`);
  console.log(`Count: ${jobs.length}`);
});
```

## Monitoring

### Queue Monitoring View

Query the `queue_monitoring` view:

```sql
SELECT * FROM queue_monitoring;
```

Returns:
- `queue_name`: Queue name
- `pending_jobs`: Total pending jobs
- `invisible_jobs`: Jobs being processed
- `visible_jobs`: Jobs available for processing
- `oldest_job_time`: Timestamp of oldest job
- `newest_job_time`: Timestamp of newest job
- `oldest_job_age_seconds`: Age of oldest job

### Job Statistics View

Query the `job_statistics` view:

```sql
SELECT * FROM job_statistics;
```

Returns:
- `total_jobs`: Total jobs processed
- `completed_jobs`: Successfully completed
- `failed_jobs`: Failed jobs
- `dlq_jobs`: Jobs in DLQ
- `pending_jobs`: Currently pending
- `avg_processing_time_seconds`: Average processing time
- `avg_attempts`: Average retry attempts
- `max_attempts_seen`: Maximum attempts observed

### Programmatic Monitoring

```javascript
// Get queue metrics
const queueMetrics = await queueService.getQueueMetrics();

// Get DLQ metrics
const dlqMetrics = await dlqService.getDLQMetrics();

// Get worker stats
const workerStats = worker.getStats();

// Combine for dashboard
const dashboard = {
  queue: queueMetrics,
  dlq: dlqMetrics,
  worker: workerStats,
  timestamp: new Date().toISOString(),
};
```

## Troubleshooting

### Queue is Growing

**Symptoms**: Queue length increasing, jobs not being processed

**Solutions**:
1. Check worker is running: `worker.getStats()`
2. Increase workers for horizontal scaling
3. Check for job handler errors
4. Verify database connectivity

### High DLQ Count

**Symptoms**: Many jobs in dead letter queue

**Solutions**:
1. Investigate error patterns: `dlqService.getJobsByErrorType()`
2. Fix underlying issues
3. Replay jobs: `dlqService.replayDeadLetterJob(msgId)`
4. Adjust retry configuration if needed

### Jobs Stuck in Processing

**Symptoms**: Jobs dequeued but never completed

**Solutions**:
1. Check visibility timeout is appropriate
2. Verify job handler doesn't hang
3. Add timeout to job processing
4. Check for unhandled exceptions

### High Retry Rate

**Symptoms**: Jobs retrying frequently

**Solutions**:
1. Investigate failure causes
2. Add better error handling
3. Increase base delay for backoff
4. Check external service availability

## Best Practices

### Job Handler Design

```javascript
const jobHandler = createJobHandler(async (message) => {
  // 1. Validate input
  if (!message.run_id) {
    throw new Error('Invalid job: missing run_id');
  }

  // 2. Add timeout
  const timeout = 30000; // 30 seconds
  const result = await Promise.race([
    processWorkflow(message),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);

  // 3. Log progress
  console.log('Job completed:', message.run_id);

  return result;
});
```

### Error Handling

```javascript
const jobHandler = createJobHandler(async (message) => {
  try {
    await processWorkflow(message);
  } catch (error) {
    // Log error with context
    console.error('Job failed:', {
      run_id: message.run_id,
      error: error.message,
      stack: error.stack,
    });

    // Rethrow to trigger retry
    throw error;
  }
});
```

### Graceful Shutdown

```javascript
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Graceful shutdown initiated');

  // Stop accepting new jobs
  await worker.stop();

  // Close database connections
  await supabase.removeAllChannels();

  console.log('Shutdown complete');
  process.exit(0);
});
```

### Monitoring and Alerts

```javascript
// Set up periodic monitoring
setInterval(async () => {
  const metrics = await queueService.getQueueMetrics();
  const dlqMetrics = await dlqService.getDLQMetrics();

  // Alert if queue is too large
  if (metrics.queue_length > 10000) {
    console.error('ALERT: Queue length exceeds threshold');
    // Send alert notification
  }

  // Alert if DLQ is growing
  if (dlqMetrics.total_jobs > 100) {
    console.error('ALERT: DLQ has too many jobs');
    // Send alert notification
  }
}, 60000); // Check every minute
```

### Performance Optimization

1. **Batch Processing**: Process multiple jobs in parallel
2. **Connection Pooling**: Use pgBouncer for database connections
3. **Worker Scaling**: Add workers based on queue depth
4. **Visibility Timeout**: Tune based on average job duration
5. **Poll Interval**: Balance between latency and database load

## References

- [PGMQ Documentation](https://tembo.io/docs/product/stacks/transactional/pgmq)
- [Queue System Architecture](./Queue-System-PGMQ.md)
- [Database Schema](../supabase/migrations/20250110000004_setup_pgmq_queues.sql)