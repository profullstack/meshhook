# Queue System: PGMQ Implementation

**Issue #89**: Document the decision to use PGMQ

## Decision

We have chosen **PGMQ (PostgreSQL Message Queue)** as our queue implementation for the MeshHook workflow engine.

## Context

MeshHook requires a reliable queue system to:
- Manage workflow job execution
- Handle retries with exponential backoff
- Support delayed/scheduled jobs
- Implement dead letter queues (DLQ)
- Provide visibility timeouts
- Scale with concurrent workers

## Options Considered

### 1. pg-boss
- **Pros**: Mature, feature-rich, good documentation
- **Cons**: Additional abstraction layer, less control over PostgreSQL features
- **Performance**: Good, but adds overhead

### 2. PGMQ (PostgreSQL Message Queue)
- **Pros**: 
  - Native PostgreSQL extension
  - Minimal overhead
  - Direct SQL access
  - Excellent performance
  - Built-in partitioning support
  - Simple API
  - Active development by Tembo
- **Cons**: Newer project, smaller community
- **Performance**: Excellent, native PostgreSQL performance

### 3. Redis/BullMQ
- **Pros**: Very fast, mature ecosystem
- **Cons**: Additional infrastructure, separate data store, complexity
- **Performance**: Excellent for high-throughput scenarios

## Decision Rationale

We chose **PGMQ** for the following reasons:

### 1. **Infrastructure Simplicity**
- No additional services required
- Leverages existing PostgreSQL database
- Reduces operational complexity
- Lower hosting costs

### 2. **Performance**
- Native PostgreSQL extension provides excellent performance
- Minimal overhead compared to application-level solutions
- Efficient use of PostgreSQL's MVCC and indexing

### 3. **Data Consistency**
- Queue operations in same database as workflow data
- Transactional guarantees with workflow state
- Simplified backup and recovery

### 4. **Feature Set**
- Visibility timeouts for job processing
- Message archiving for audit trails
- Partitioning support for scalability
- Dead letter queue support
- Scheduled/delayed messages

### 5. **Integration**
- Direct SQL access when needed
- Works seamlessly with Supabase
- Easy to query and monitor
- Familiar PostgreSQL tooling

### 6. **Scalability**
- Horizontal scaling via read replicas
- Partitioning for high-volume scenarios
- Connection pooling support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MeshHook Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Web API    │────────▶│Queue Service │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                           │
│  ┌──────────────┐                │                           │
│  │   Workers    │◀───────────────┘                           │
│  └──────┬───────┘                                            │
│         │                                                     │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL + PGMQ                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  workflow_jobs   │    │  workflow_jobs   │              │
│  │  (main queue)    │───▶│  (DLQ)           │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                               │
│  ┌──────────────────┐                                        │
│  │  workflow_runs   │                                        │
│  │  workflow_events │                                        │
│  └──────────────────┘                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Queue Design

### Main Queue: `workflow_jobs`
- Stores pending workflow execution jobs
- Supports visibility timeout (default: 30 seconds)
- Automatic retry with exponential backoff
- Max retry attempts: 5 (configurable)

### Dead Letter Queue: `workflow_jobs_dlq`
- Receives jobs that exceed max retry attempts
- Allows manual inspection and replay
- Permanent storage for failed jobs

### Job Structure
```json
{
  "run_id": "uuid",
  "workflow_id": "uuid",
  "project_id": "uuid",
  "attempt": 1,
  "max_attempts": 5,
  "scheduled_at": "2025-01-10T00:00:00Z",
  "metadata": {}
}
```

## Implementation Plan

1. **Migration** (Issue #90): Install PGMQ extension and create queues
2. **Queue Service** (Issue #91): Implement enqueue/dequeue operations
3. **Retry Logic** (Issue #92): Add exponential backoff with jitter
4. **DLQ** (Issue #93): Implement dead letter queue handling
5. **Worker**: Create worker process to consume jobs
6. **Monitoring**: Add queue metrics and health checks

## Performance Considerations

### Expected Throughput
- **Enqueue**: ~10,000 jobs/second
- **Dequeue**: ~5,000 jobs/second per worker
- **Latency**: <10ms for enqueue/dequeue operations

### Scaling Strategy
- Start with single worker
- Scale horizontally by adding workers
- Use connection pooling (pgBouncer)
- Partition queues if needed (>1M jobs/day)

### Resource Requirements
- **CPU**: Minimal overhead
- **Memory**: ~100MB per worker
- **Storage**: ~1KB per job message
- **Connections**: 2 per worker (read + write)

## Monitoring

### Key Metrics
- Queue depth (pending jobs)
- Processing rate (jobs/second)
- Average processing time
- Retry rate
- DLQ size
- Worker health

### Alerts
- Queue depth > 10,000 jobs
- DLQ size > 100 jobs
- Processing rate < 10 jobs/second
- Worker failures

## Migration Path

If we need to migrate away from PGMQ in the future:
1. Queue interface is abstracted in `QueueService` class
2. Swap implementation without changing application code
3. Gradual migration using dual-write pattern
4. Minimal downtime required

## References

- [PGMQ GitHub](https://github.com/tembo-io/pgmq)
- [PGMQ Documentation](https://tembo.io/docs/product/stacks/transactional/pgmq)
- [PostgreSQL Message Queue Patterns](https://www.postgresql.org/docs/current/sql-notify.html)

## Conclusion

PGMQ provides the optimal balance of:
- **Simplicity**: No additional infrastructure
- **Performance**: Native PostgreSQL speed
- **Reliability**: ACID guarantees
- **Features**: Everything we need for workflow execution
- **Cost**: Minimal operational overhead

This decision aligns with our goal of building a robust, scalable workflow engine while minimizing operational complexity.