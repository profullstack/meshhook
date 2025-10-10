/**
 * Circuit Breaker Implementation
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * in distributed systems. The circuit breaker has three states:
 * 
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests fail fast
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 * 
 * @example
 * const breaker = new CircuitBreaker(fetchData, {
 *   failureThreshold: 5,
 *   resetTimeout: 60000
 * });
 * 
 * try {
 *   const result = await breaker.execute(arg1, arg2);
 * } catch (error) {
 *   console.error('Circuit breaker error:', error);
 * }
 */

const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  /**
   * Create a circuit breaker
   * @param {Function} fn - The async function to wrap
   * @param {Object} options - Configuration options
   * @param {number} options.failureThreshold - Number of failures before opening (default: 5)
   * @param {number} options.resetTimeout - Time in ms before attempting to close (default: 60000)
   * @param {number} options.halfOpenMaxAttempts - Max successful attempts in half-open before closing (default: 1)
   */
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 1;

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
    this.halfOpenAttempts = 0;
  }

  /**
   * Execute the wrapped function with circuit breaker protection
   * @param {...any} args - Arguments to pass to the wrapped function
   * @returns {Promise<any>} Result from the wrapped function
   * @throws {Error} If circuit is open or function fails
   */
  async execute(...args) {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(
          `Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`
        );
      }
      this.state = STATES.HALF_OPEN;
      this.halfOpenAttempts = 0;
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   * @private
   */
  onSuccess() {
    this.successCount++;

    if (this.state === STATES.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        this.close();
      }
    } else if (this.state === STATES.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   * @private
   */
  onFailure() {
    this.failureCount++;

    if (this.state === STATES.HALF_OPEN) {
      // Any failure in half-open immediately reopens the circuit
      this.open();
    } else if (this.state === STATES.CLOSED) {
      if (this.failureCount >= this.failureThreshold) {
        this.open();
      }
    }
  }

  /**
   * Open the circuit breaker
   * @private
   */
  open() {
    this.state = STATES.OPEN;
    this.nextAttemptTime = Date.now() + this.resetTimeout;
  }

  /**
   * Close the circuit breaker
   * @private
   */
  close() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Get current circuit breaker statistics
   * @returns {Object} Current state and metrics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      nextAttemptTime: this.nextAttemptTime,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Manually reset the circuit breaker to closed state
   */
  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.nextAttemptTime = null;
  }
}

/**
 * Create a circuit breaker with default options
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Configuration options
 * @returns {CircuitBreaker} New circuit breaker instance
 */
export function createCircuitBreaker(fn, options) {
  return new CircuitBreaker(fn, options);
}