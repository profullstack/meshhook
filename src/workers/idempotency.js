import { createHash } from 'node:crypto';

/**
 * Idempotency Manager Implementation
 * 
 * Ensures operations can be safely retried without duplicate side effects.
 * Uses a storage backend to track operation results by idempotency keys.
 * 
 * @example
 * const manager = new IdempotencyManager(storageAdapter);
 * 
 * const result = await manager.execute(
 *   'workflow-123-step-456',
 *   async () => {
 *     // Expensive or side-effect operation
 *     return await processPayment();
 *   }
 * );
 */

/**
 * Custom error class for idempotency errors
 */
export class IdempotencyError extends Error {
  /**
   * Create an idempotency error
   * @param {string} message - Error message
   * @param {string} idempotencyKey - The idempotency key that caused the error
   */
  constructor(message, idempotencyKey) {
    super(message);
    this.name = 'IdempotencyError';
    this.idempotencyKey = idempotencyKey;
    Error.captureStackTrace?.(this, IdempotencyError);
  }
}

/**
 * Idempotency Manager
 * 
 * Manages idempotent execution of operations using a storage backend.
 */
export class IdempotencyManager {
  /**
   * Create an idempotency manager
   * @param {Object} storage - Storage adapter with get/set/delete methods
   * @param {Function} storage.get - Get value by key
   * @param {Function} storage.set - Set value by key with TTL
   * @param {Function} storage.delete - Delete value by key
   * @param {Object} options - Configuration options
   * @param {number} options.ttl - Time to live in milliseconds (default: 24 hours)
   */
  constructor(storage, options = {}) {
    this.storage = storage;
    this.ttl = options.ttl ?? 24 * 60 * 60 * 1000; // 24 hours default
    this.pendingOperations = new Map(); // Track in-flight operations
  }

  /**
   * Execute a function with idempotency protection
   * 
   * @param {string} key - Idempotency key
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result from the function or cached result
   * 
   * @example
   * const result = await manager.execute('key-123', async () => {
   *   return await expensiveOperation();
   * });
   */
  async execute(key, fn) {
    // Check if result is already cached
    const cached = await this.storage.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if operation is already in progress
    if (this.pendingOperations.has(key)) {
      // Wait for the in-progress operation to complete
      return await this.pendingOperations.get(key);
    }

    // Execute the operation
    const operationPromise = this._executeOperation(key, fn);
    this.pendingOperations.set(key, operationPromise);

    try {
      const result = await operationPromise;
      return result;
    } finally {
      this.pendingOperations.delete(key);
    }
  }

  /**
   * Execute the operation and cache the result
   * @private
   */
  async _executeOperation(key, fn) {
    try {
      const result = await fn();
      
      // Cache the successful result
      await this.storage.set(key, result, this.ttl);
      
      return result;
    } catch (error) {
      // Don't cache errors - allow retry on failure
      throw error;
    }
  }

  /**
   * Clear cached result for a specific key
   * 
   * @param {string} key - Idempotency key to clear
   * @returns {Promise<void>}
   * 
   * @example
   * await manager.clear('key-123');
   */
  async clear(key) {
    await this.storage.delete(key);
  }

  /**
   * Generate an idempotency key from components
   * 
   * @param {...any} components - Components to hash into a key
   * @returns {string} Generated idempotency key
   * 
   * @example
   * const key = IdempotencyManager.generateKey('run-123', 'step-456', 'retry-1');
   */
  static generateKey(...components) {
    const data = components.map(c => String(c)).join(':');
    return createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Create an in-memory storage adapter for testing
 * 
 * @returns {Object} Storage adapter
 */
export function createMemoryStorage() {
  const storage = new Map();

  return {
    async get(key) {
      const item = storage.get(key);
      if (!item) return undefined;
      
      // Check if expired
      if (item.expiresAt && item.expiresAt < Date.now()) {
        storage.delete(key);
        return undefined;
      }
      
      return item.value;
    },

    async set(key, value, ttl) {
      storage.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
      });
    },

    async delete(key) {
      storage.delete(key);
    },

    // Helper for testing
    clear() {
      storage.clear();
    },
  };
}

/**
 * Create a Redis storage adapter
 * 
 * @param {Object} redis - Redis client instance
 * @returns {Object} Storage adapter
 * 
 * @example
 * import { createClient } from 'redis';
 * const redis = createClient();
 * await redis.connect();
 * const storage = createRedisStorage(redis);
 */
export function createRedisStorage(redis) {
  return {
    async get(key) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : undefined;
    },

    async set(key, value, ttl) {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setEx(key, Math.ceil(ttl / 1000), serialized);
      } else {
        await redis.set(key, serialized);
      }
    },

    async delete(key) {
      await redis.del(key);
    },
  };
}