# MeshHook Queue System

PGMQ-based queue system for reliable workflow job processing with retry logic and dead letter queue support.

## Features

- ✅ **PGMQ Integration**: Native PostgreSQL message queue
- ✅ **Automatic Retries**: Exponential backoff with jitter
- ✅ **Dead Letter Queue**: Failed job management and replay
- ✅ **Job Tracking**: Complete job lifecycle tracking
- ✅ **Horizontal Scaling**: Multiple worker support
- ✅ **Monitoring**: Built-in metrics and statistics
- ✅ **Type Safety**: Full JSDoc documentation

## Quick Start

### Installation

```bash
# Install dependencies
pnpm add @supabase/supabase-js

# Run migration
pnpm run db:migrate
```

### Basic Usage

```javascript
import { createClient } from '@supabase/supabase-js';
import { QueueService, Worker, createJobHandler } from './src/queue/index.js';

// Initialize
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const queueService = new QueueService(supabase);

// Enqueue a job
await queueService.enqueue({
  run_id: 'uuid',
  workflow_id: 'uuid',
  project_id: 'uuid',
});

// Create worker
const worker = new Worker({
  supabaseClient: supabase,
  jobHandler: createJobHandler(async (message) => {
    console.log('Processing:', message.run_id);
    // Your processing logic here
  }),
});

await worker.start();
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ QueueService │────────▶│ DLQService   │                  │
│  └──────┬───────┘         └──────────────┘                  │
│         │                                                     │
│         │                 ┌──────────────┐                   │
│         └────────────────▶│   Worker     │                  │
│                           └──────┬───────┘                   │
│                                  │                            │
│                           ┌──────┴───────┐                   │
│                           │RetryStrategy │                   │
│                           └──────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL + PGMQ                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  workflow_jobs   │───▶│  workflow_jobs   │              │
│  │  (main queue)    │    │  (DLQ)           │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  job_tracking    │    │  queue_config    │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### QueueService

Manages job enqueue/dequeue operations.

```javascript
const queueService = new QueueService(supabase, 'workflow_jobs');

// Enqueue
await queueService.enqueue(jobData, delaySeconds);

// Dequeue
const job = await queueService.dequeue(visibilityTimeout);

// Acknowledge
await queueService.acknowledge(msgId);

// Metrics
const metrics = await queueService.getQueueMetrics();
```

### DLQService

Manages dead letter queue operations.

```javascript
const dlqService = new DLQService(supabase);

// List DLQ jobs
const jobs = await dlqService.listDeadLetterJobs();

// Replay job
await dlqService.replayDeadLetterJob(msgId);

// Get metrics
const metrics = await dlqService.getDLQMetrics();
```

### RetryStrategy

Calculates retry delays with exponential backoff.

```javascript
const strategy = new RetryStrategy({
  baseDelayMs: 1000,
  maxDelayMs: 300000,
  maxAttempts: 5,
});

const info = strategy.getRetryInfo(attempt);
// { attempt, maxAttempts, canRetry, delayMs, delaySeconds, shouldMoveToDeadLetter }
```

### Worker

Processes jobs from the queue.

```javascript
const worker = new Worker({
  supabaseClient: supabase,
  jobHandler: async (message) => {
    // Process job
  },
  pollIntervalMs: 1000,
  visibilityTimeoutSeconds: 30,
  retryConfig: {
    baseDelayMs: 1000,
    maxDelayMs: 300000,
    maxAttempts: 5,
  },
});

await worker.start();
const stats = worker.getStats();
await worker.stop();
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/queue/queue-service.test.js

# Run integration tests
pnpm test src/queue/integration.test.js
```

## Configuration

### Queue Configuration

Stored in `queue_config` table:

```sql
SELECT * FROM queue_config WHERE queue_name = 'workflow_jobs';
```

| Field | Default | Description |
|-------|---------|-------------|
| visibility_timeout_seconds | 30 | Job visibility timeout |
| max_retry_attempts | 5 | Maximum retry attempts |
| retry_backoff_base_ms | 1000 | Base retry delay |
| retry_backoff_max_ms | 300000 | Maximum retry delay |
| dlq_enabled | true | Enable DLQ |

### Environment Variables

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

## Monitoring

### Queue Metrics

```javascript
const metrics = await queueService.getQueueMetrics();
// {
//   queue_name: 'workflow_jobs',
//   queue_length: 42,
//   oldest_msg_age_seconds: 120,
//   newest_msg_age_seconds: 5
// }
```

### Worker Statistics

```javascript
const stats = worker.getStats();
// {
//   processed: 100,
//   succeeded: 95,
//   failed: 5,
//   retried: 10,
//   movedToDLQ: 2
// }
```

### Database Views

```sql
-- Queue monitoring
SELECT * FROM queue_monitoring;

-- Job statistics
SELECT * FROM job_statistics;
```

## Performance

### Expected Throughput

- **Enqueue**: ~10,000 jobs/second
- **Dequeue**: ~5,000 jobs/second per worker
- **Latency**: <10ms for enqueue/dequeue

### Scaling

- **Vertical**: Increase worker poll frequency
- **Horizontal**: Add more worker instances
- **Database**: Use connection pooling (pgBouncer)

## Troubleshooting

### Queue Growing

1. Check worker is running
2. Increase number of workers
3. Check job handler for errors
4. Verify database connectivity

### High DLQ Count

1. Investigate error patterns
2. Fix underlying issues
3. Replay jobs from DLQ
4. Adjust retry configuration

### Jobs Stuck

1. Check visibility timeout
2. Verify job handler doesn't hang
3. Add timeout to processing
4. Check for unhandled exceptions

## Documentation

- [Queue Operations Guide](../../docs/Queue-Operations.md)
- [PGMQ Decision Document](../../docs/Queue-System-PGMQ.md)
- [Database Migration](../../supabase/migrations/20250110000004_setup_pgmq_queues.sql)

## API Reference

### QueueService

- `constructor(supabaseClient, queueName)`
- `enqueue(jobData, delaySeconds)` → `Promise<{msg_id}>`
- `dequeue(vtSeconds)` → `Promise<Job|null>`
- `acknowledge(msgId)` → `Promise<boolean>`
- `archiveJob(msgId)` → `Promise<boolean>`
- `getQueueMetrics()` → `Promise<Metrics>`
- `purgeQueue()` → `Promise<number>`

### DLQService

- `constructor(supabaseClient, dlqName)`
- `moveToDeadLetter(job, errorMessage, errorStack)` → `Promise<{dlq_msg_id}>`
- `listDeadLetterJobs(limit)` → `Promise<Job[]>`
- `getDeadLetterJob(dlqMsgId)` → `Promise<Job|null>`
- `replayDeadLetterJob(dlqMsgId, targetQueue)` → `Promise<{new_msg_id}>`
- `deleteDeadLetterJob(dlqMsgId)` → `Promise<boolean>`
- `getDLQMetrics()` → `Promise<Metrics>`
- `purgeDLQ()` → `Promise<number>`
- `getJobsByErrorType()` → `Promise<Object>`
- `replayMultipleJobs(dlqMsgIds, targetQueue)` → `Promise<Results>`

### RetryStrategy

- `constructor(config)`
- `getNextDelay(attempt)` → `number`
- `canRetry(attempt)` → `boolean`
- `getDelaySeconds(attempt)` → `number`
- `shouldMoveToDeadLetter(attempt)` → `boolean`
- `getRetryInfo(attempt)` → `Object`
- `getAllRetryDelays()` → `Array<Object>`
- `getConfig()` → `Object`

### Worker

- `constructor(config)`
- `start()` → `Promise<void>`
- `stop()` → `Promise<void>`
- `getStats()` → `Object`

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)