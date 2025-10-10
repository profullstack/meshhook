/**
 * Timeout Handler Implementation
 * 
 * Provides utilities for adding timeout constraints to async operations.
 * Ensures operations fail fast if they exceed specified time limits.
 * 
 * @example
 * import { withTimeout } from './timeout-handler.js';
 * 
 * try {
 *   const result = await withTimeout(
 *     fetchData(),
 *     5000,
 *     'Data fetch timed out'
 *   );
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.error('Operation timed out:', error.timeout);
 *   }
 * }
 */

/**
 * Custom error class for timeout errors
 */
export class TimeoutError extends Error {
  /**
   * Create a timeout error
   * @param {string} message - Error message
   * @param {number} timeout - Timeout duration in milliseconds
   */
  constructor(message, timeout) {
    super(message || `Operation timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.timeout = timeout;
    Error.captureStackTrace?.(this, TimeoutError);
  }
}

/**
 * Wrap a promise with a timeout
 * 
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} [message] - Optional custom error message
 * @returns {Promise} Promise that rejects with TimeoutError if timeout exceeded
 * 
 * @example
 * const result = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API request timed out'
 * );
 */
export function withTimeout(promise, timeoutMs, message) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(message, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Create a timeout wrapper function for reusable timeout logic
 * 
 * @param {number} timeoutMs - Default timeout in milliseconds
 * @param {string} [message] - Default error message
 * @returns {Function} Function that wraps promises with timeout
 * 
 * @example
 * const withFiveSecondTimeout = createTimeoutWrapper(5000);
 * const result = await withFiveSecondTimeout(fetchData());
 */
export function createTimeoutWrapper(timeoutMs, message) {
  return (promise) => withTimeout(promise, timeoutMs, message);
}

/**
 * Execute an async function with timeout
 * 
 * @param {Function} fn - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} [message] - Optional custom error message
 * @param {...any} args - Arguments to pass to the function
 * @returns {Promise} Result of the function or TimeoutError
 * 
 * @example
 * const result = await executeWithTimeout(
 *   async (id) => await fetchUser(id),
 *   3000,
 *   'User fetch timed out',
 *   userId
 * );
 */
export async function executeWithTimeout(fn, timeoutMs, message, ...args) {
  return withTimeout(fn(...args), timeoutMs, message);
}