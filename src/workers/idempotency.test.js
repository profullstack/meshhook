import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdempotencyManager, IdempotencyError } from './idempotency.js';

describe('IdempotencyManager', () => {
  let manager;
  let storage;

  beforeEach(() => {
    // Simple in-memory storage for testing
    storage = new Map();
    manager = new IdempotencyManager({
      get: async (key) => {
        const item = storage.get(key);
        if (!item) return undefined;
        if (item.expiresAt && item.expiresAt < Date.now()) {
          storage.delete(key);
          return undefined;
        }
        return item.value;
      },
      set: async (key, value, ttl) => {
        storage.set(key, { value, expiresAt: Date.now() + ttl });
      },
      delete: async (key) => storage.delete(key),
    });
  });

  afterEach(() => {
    storage.clear();
  });

  describe('IdempotencyError', () => {
    it('should create idempotency error with message', () => {
      const error = new IdempotencyError('Duplicate request', 'key-123');
      assert.equal(error.name, 'IdempotencyError');
      assert.equal(error.message, 'Duplicate request');
      assert.equal(error.idempotencyKey, 'key-123');
      assert.ok(error instanceof Error);
    });
  });

  describe('execute', () => {
    it('should execute function on first call', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'result';
      };

      const result = await manager.execute('key-1', fn);
      assert.equal(result, 'result');
      assert.equal(callCount, 1);
    });

    it('should return cached result on duplicate call', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'result';
      };

      const result1 = await manager.execute('key-2', fn);
      const result2 = await manager.execute('key-2', fn);

      assert.equal(result1, 'result');
      assert.equal(result2, 'result');
      assert.equal(callCount, 1); // Function only called once
    });

    it('should handle concurrent requests with same key', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'result';
      };

      const [result1, result2, result3] = await Promise.all([
        manager.execute('key-3', fn),
        manager.execute('key-3', fn),
        manager.execute('key-3', fn),
      ]);

      assert.equal(result1, 'result');
      assert.equal(result2, 'result');
      assert.equal(result3, 'result');
      assert.equal(callCount, 1); // Function only called once despite concurrent requests
    });

    it('should execute function again after TTL expires', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const shortTtlManager = new IdempotencyManager(
        {
          get: async (key) => {
            const item = storage.get(key);
            if (item && item.expiresAt > Date.now()) {
              return item.value;
            }
            return undefined;
          },
          set: async (key, value, ttl) => {
            storage.set(key, { value, expiresAt: Date.now() + ttl });
          },
          delete: async (key) => storage.delete(key),
        },
        { ttl: 50 }
      );

      const result1 = await shortTtlManager.execute('key-4', fn);
      assert.equal(result1, 'result-1');
      assert.equal(callCount, 1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result2 = await shortTtlManager.execute('key-4', fn);
      assert.equal(result2, 'result-2');
      assert.equal(callCount, 2);
    });

    it('should handle function errors correctly', async () => {
      const fn = async () => {
        throw new Error('Function failed');
      };

      await assert.rejects(
        manager.execute('key-5', fn),
        /Function failed/
      );

      // Should not cache errors, so second call should also fail
      await assert.rejects(
        manager.execute('key-5', fn),
        /Function failed/
      );
    });

    it('should handle different keys independently', async () => {
      let callCount = 0;
      const fn = async (id) => {
        callCount++;
        return `result-${id}`;
      };

      const result1 = await manager.execute('key-6', () => fn(1));
      const result2 = await manager.execute('key-7', () => fn(2));
      const result3 = await manager.execute('key-6', () => fn(3));

      assert.equal(result1, 'result-1');
      assert.equal(result2, 'result-2');
      assert.equal(result3, 'result-1'); // Cached from first call
      assert.equal(callCount, 2); // Only called for key-6 and key-7
    });

    it('should preserve result data types', async () => {
      const objectResult = { key: 'value', nested: { data: 123 } };
      const arrayResult = [1, 2, 3];
      const numberResult = 42;
      const boolResult = true;
      const nullResult = null;

      assert.deepEqual(
        await manager.execute('obj', async () => objectResult),
        objectResult
      );
      assert.deepEqual(
        await manager.execute('arr', async () => arrayResult),
        arrayResult
      );
      assert.equal(
        await manager.execute('num', async () => numberResult),
        42
      );
      assert.equal(
        await manager.execute('bool', async () => boolResult),
        true
      );
      assert.equal(
        await manager.execute('null', async () => nullResult),
        null
      );
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = IdempotencyManager.generateKey('run-123', 'step-456');
      const key2 = IdempotencyManager.generateKey('run-123', 'step-456');
      assert.equal(key1, key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = IdempotencyManager.generateKey('run-123', 'step-456');
      const key2 = IdempotencyManager.generateKey('run-123', 'step-789');
      const key3 = IdempotencyManager.generateKey('run-456', 'step-456');
      
      assert.notEqual(key1, key2);
      assert.notEqual(key1, key3);
      assert.notEqual(key2, key3);
    });

    it('should handle various input types', () => {
      const key1 = IdempotencyManager.generateKey('string', 123, true, null);
      const key2 = IdempotencyManager.generateKey('string', 123, true, null);
      assert.equal(key1, key2);
    });
  });

  describe('clear', () => {
    it('should clear cached result for specific key', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'result';
      };

      await manager.execute('key-8', fn);
      assert.equal(callCount, 1);

      await manager.clear('key-8');

      await manager.execute('key-8', fn);
      assert.equal(callCount, 2); // Function called again after clear
    });

    it('should not affect other keys when clearing', async () => {
      let callCount = 0;
      const fn = async (id) => {
        callCount++;
        return `result-${id}`;
      };

      await manager.execute('key-9', () => fn(1));
      await manager.execute('key-10', () => fn(2));
      assert.equal(callCount, 2);

      await manager.clear('key-9');

      const result1 = await manager.execute('key-9', () => fn(3));
      const result2 = await manager.execute('key-10', () => fn(4));

      assert.equal(result1, 'result-3'); // New execution
      assert.equal(result2, 'result-2'); // Cached result
      assert.equal(callCount, 3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string keys', async () => {
      const fn = async () => 'result';
      const result = await manager.execute('', fn);
      assert.equal(result, 'result');
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      const fn = async () => 'result';
      const result = await manager.execute(longKey, fn);
      assert.equal(result, 'result');
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key-with-!@#$%^&*()_+-={}[]|:";\'<>?,./';
      const fn = async () => 'result';
      const result = await manager.execute(specialKey, fn);
      assert.equal(result, 'result');
    });

    it('should handle async function that returns promise', async () => {
      const fn = async () => Promise.resolve('nested-promise');
      const result = await manager.execute('key-11', fn);
      assert.equal(result, 'nested-promise');
    });
  });
});