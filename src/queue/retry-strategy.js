// RetryStrategy - Exponential Backoff with Jitter
// Issue #92: Add retry logic with exponential backoff + jitter
// Implements retry logic to prevent thundering herd problem

/**
 * Calculate exponential backoff delay with jitter
 * Formula: min(maxDelay, baseDelay * 2^(attempt-1)) + random jitter
 * Jitter prevents thundering herd problem when multiple jobs retry simultaneously
 * 
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds with jitter applied
 */
export function calculateBackoff(attempt, baseDelayMs, maxDelayMs) {
  // Ensure attempt is at least 1
  const safeAttempt = Math.max(1, attempt);
  
  // Calculate exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, safeAttempt - 1);
  
  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  
  // Add jitter: random value between 0 and cappedDelay
  // This spreads out retry attempts to prevent thundering herd
  const jitter = Math.random() * cappedDelay;
  
  // Return delay with jitter, capped at max
  return Math.min(cappedDelay + jitter, maxDelayMs);
}

/**
 * Determine if a job should be retried
 * @param {number} attempt - Current attempt number
 * @param {number} maxAttempts - Maximum allowed attempts
 * @returns {boolean} True if job should be retried
 */
export function shouldRetry(attempt, maxAttempts) {
  return attempt < maxAttempts;
}

/**
 * RetryStrategy class for managing retry logic
 * Encapsulates retry configuration and provides helper methods
 */
export class RetryStrategy {
  /**
   * Create a RetryStrategy instance
   * @param {Object} config - Retry configuration
   * @param {number} config.baseDelayMs - Base delay in milliseconds (default: 1000)
   * @param {number} config.maxDelayMs - Maximum delay in milliseconds (default: 300000 = 5 minutes)
   * @param {number} config.maxAttempts - Maximum retry attempts (default: 5)
   */
  constructor(config = {}) {
    this.config = {
      baseDelayMs: config.baseDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 300000,
      maxAttempts: config.maxAttempts ?? 5,
    };
  }

  /**
   * Get the next retry delay for a given attempt
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  getNextDelay(attempt) {
    return calculateBackoff(
      attempt,
      this.config.baseDelayMs,
      this.config.maxDelayMs
    );
  }

  /**
   * Check if job can be retried
   * @param {number} attempt - Current attempt number
   * @returns {boolean} True if retry is allowed
   */
  canRetry(attempt) {
    return shouldRetry(attempt, this.config.maxAttempts);
  }

  /**
   * Get delay in seconds (rounded)
   * Useful for PGMQ delay parameter which expects seconds
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in seconds
   */
  getDelaySeconds(attempt) {
    const delayMs = this.getNextDelay(attempt);
    return Math.round(delayMs / 1000);
  }

  /**
   * Determine if job should be moved to dead letter queue
   * @param {number} attempt - Current attempt number
   * @returns {boolean} True if job should move to DLQ
   */
  shouldMoveToDeadLetter(attempt) {
    return !this.canRetry(attempt);
  }

  /**
   * Get comprehensive retry information for a job
   * @param {number} attempt - Current attempt number
   * @returns {Object} Retry information object
   */
  getRetryInfo(attempt) {
    const delayMs = this.getNextDelay(attempt);
    
    return {
      attempt,
      maxAttempts: this.config.maxAttempts,
      canRetry: this.canRetry(attempt),
      delayMs,
      delaySeconds: Math.round(delayMs / 1000),
      shouldMoveToDeadLetter: this.shouldMoveToDeadLetter(attempt),
    };
  }

  /**
   * Calculate all retry delays for visualization/debugging
   * @returns {Array<Object>} Array of retry delay information
   */
  getAllRetryDelays() {
    const delays = [];
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      const delayMs = this.getNextDelay(attempt);
      delays.push({
        attempt,
        delayMs,
        delaySeconds: Math.round(delayMs / 1000),
        delayMinutes: Math.round(delayMs / 60000),
      });
    }
    
    return delays;
  }

  /**
   * Get configuration summary
   * @returns {Object} Configuration object
   */
  getConfig() {
    return { ...this.config };
  }
}

/**
 * Create a RetryStrategy instance with default or custom config
 * @param {Object} config - Optional retry configuration
 * @returns {RetryStrategy} RetryStrategy instance
 */
export function createRetryStrategy(config) {
  return new RetryStrategy(config);
}

/**
 * Default retry strategy instance
 * Can be imported and used directly for standard retry behavior
 */
export const defaultRetryStrategy = new RetryStrategy();