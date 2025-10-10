# MeshHook Workers Module

This module contains the core worker components for the MeshHook workflow engine, implementing resilience patterns and utilities for robust distributed execution.

## Components

### Circuit Breaker (`circuit-breaker.js`)

Implements the circuit breaker pattern to prevent cascading failures in distributed systems.

**States:**
- `CLOSED`: Normal operation, requests pass through
- `OPEN`: Failures exceeded threshold, requests fail fast
- `HALF_OPEN`: Testing if service recovered, limited requests allowed

**Usage:**
```javascript
import { CircuitBreaker } from './circuit-breaker.js';

const breaker = new CircuitBreaker(fetchData, {
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 60000,      // Try to close after 60s
  halfOpenMaxAttempts: 1    // Attempts before closing
});

try {
  const result = await breaker.execute(arg1, arg2);
} catch (error) {
  console.error('Circuit breaker error:', error);
}
```

**Features:**
- Automatic state transitions
- Configurable failure thresholds
- Reset timeout for recovery attempts
- Statistics tracking

### Timeout Handler (`timeout-handler.js`)

Provides utilities for adding timeout constraints to async operations.

**Usage:**
```javascript
import { withTimeout, TimeoutError } from './timeout-handler.js';

try {
  const result = await withTimeout(
    fetchData(),
    5000,
    'Data fetch timed out'
  );
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Operation timed out:', error.timeout);
  }
}
```

**Features:**
- Promise-based timeout wrapping
- Custom error messages
- Automatic timer cleanup
- Helper functions for common patterns

### Idempotency Manager (`idempotency.js`)

Ensures operations can be safely retried without duplicate side effects.

**Usage:**
```javascript
import { IdempotencyManager, createMemoryStorage } from './idempotency.js';

const storage = createMemoryStorage();
const manager = new IdempotencyManager(storage, {
  ttl: 24 * 60 * 60 * 1000  // 24 hours
});

const result = await manager.execute(
  'workflow-123-step-456',
  async () => {
    // Expensive or side-effect operation
    return await processPayment();
  }
);
```

**Features:**
- Pluggable storage backends (memory, Redis)
- Concurrent request deduplication
- Configurable TTL
- Key generation utilities

**Storage Adapters:**
- `createMemoryStorage()`: In-memory storage for testing
- `createRedisStorage(redis)`: Redis-backed storage for production

## Testing

All components include comprehensive test suites using Node.js native test runner.

Run tests:
```bash
# Test all components
node --test src/workers/*.test.js

# Test individual components
node --test src/workers/circuit-breaker.test.js
node --test src/workers/timeout-handler.test.js
node --test src/workers/idempotency.test.js
```

## Integration with Workers

These components are designed to be integrated into the orchestrator and HTTP executor workers:

### Orchestrator Worker Integration

```javascript
import { CircuitBreaker } from './circuit-breaker.js';
import { withTimeout } from './timeout-handler.js';
import { IdempotencyManager } from './idempotency.js';

// Wrap database operations with circuit breaker
const dbBreaker = new CircuitBreaker(
  async (query) => await db.query(query),
  { failureThreshold: 5, resetTimeout: 30000 }
);

// Add timeout to operations
const result = await withTimeout(
  dbBreaker.execute('SELECT * FROM runs'),
  5000
);

// Ensure idempotent execution
const idempotency = new IdempotencyManager(storage);
await idempotency.execute(
  `run-${runId}-step-${stepId}`,
  async () => await executeStep(runId, stepId)
);
```

### HTTP Executor Worker Integration

```javascript
import { CircuitBreaker } from './circuit-breaker.js';
import { withTimeout } from './timeout-handler.js';

// Wrap HTTP calls with circuit breaker
const httpBreaker = new CircuitBreaker(
  async (url, options) => await fetch(url, options),
  { failureThreshold: 3, resetTimeout: 60000 }
);

// Add timeout to HTTP requests
const response = await withTimeout(
  httpBreaker.execute(url, { method: 'POST', body: data }),
  10000,
  'HTTP request timed out'
);
```

## Architecture Principles

1. **Fail Fast**: Circuit breakers prevent wasting resources on failing services
2. **Timeout Protection**: All operations have bounded execution time
3. **Idempotency**: Safe retry of operations without duplicate side effects
4. **Observability**: All components provide statistics and state information
5. **Composability**: Components can be combined for layered resilience

## Error Handling

All components use custom error classes for clear error identification:

- `TimeoutError`: Operation exceeded time limit
- `IdempotencyError`: Idempotency-related errors
- Circuit breaker errors include state information

## Performance Considerations

- Circuit breakers use minimal memory (state tracking only)
- Timeout handlers automatically clean up timers
- Idempotency manager supports concurrent requests efficiently
- All components are designed for high-throughput scenarios

## Future Enhancements

- [ ] Bulkhead pattern for resource isolation
- [ ] Rate limiting utilities
- [ ] Retry strategies with exponential backoff
- [ ] Metrics collection and export
- [ ] Health check endpoints