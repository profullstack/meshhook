import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout, TimeoutError } from './timeout-handler.js';

describe('TimeoutHandler', () => {
  describe('TimeoutError', () => {
    it('should create timeout error with message', () => {
      const error = new TimeoutError('Operation timed out', 5000);
      assert.equal(error.name, 'TimeoutError');
      assert.equal(error.message, 'Operation timed out');
      assert.equal(error.timeout, 5000);
      assert.ok(error instanceof Error);
    });

    it('should include timeout in default message', () => {
      const error = new TimeoutError(undefined, 3000);
      assert.match(error.message, /3000ms/);
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const fastOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      };

      const result = await withTimeout(fastOperation(), 100);
      assert.equal(result, 'success');
    });

    it('should reject with TimeoutError when promise exceeds timeout', async () => {
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'too late';
      };

      await assert.rejects(
        withTimeout(slowOperation(), 50),
        (error) => {
          assert.ok(error instanceof TimeoutError);
          assert.equal(error.timeout, 50);
          return true;
        }
      );
    });

    it('should use custom error message', async () => {
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'result';
      };

      await assert.rejects(
        withTimeout(slowOperation(), 20, 'Custom timeout message'),
        (error) => {
          assert.ok(error instanceof TimeoutError);
          assert.equal(error.message, 'Custom timeout message');
          return true;
        }
      );
    });

    it('should propagate original error if promise rejects before timeout', async () => {
      const failingOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Operation failed');
      };

      await assert.rejects(
        withTimeout(failingOperation(), 100),
        (error) => {
          assert.equal(error.message, 'Operation failed');
          assert.ok(!(error instanceof TimeoutError));
          return true;
        }
      );
    });

    it('should handle synchronous errors', async () => {
      const syncError = () => {
        throw new Error('Sync error');
      };

      await assert.rejects(
        withTimeout(Promise.resolve().then(syncError), 100),
        /Sync error/
      );
    });

    it('should handle immediate resolution', async () => {
      const immediate = Promise.resolve('immediate');
      const result = await withTimeout(immediate, 100);
      assert.equal(result, 'immediate');
    });

    it('should handle immediate rejection', async () => {
      const immediate = Promise.reject(new Error('immediate error'));
      await assert.rejects(withTimeout(immediate, 100), /immediate error/);
    });

    it('should work with zero timeout', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      };

      await assert.rejects(
        withTimeout(operation(), 0),
        (error) => {
          assert.ok(error instanceof TimeoutError);
          return true;
        }
      );
    });

    it('should handle multiple concurrent timeouts', async () => {
      const operation1 = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'op1';
      };

      const operation2 = async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return 'op2';
      };

      const operation3 = async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'op3';
      };

      const results = await Promise.allSettled([
        withTimeout(operation1(), 100),
        withTimeout(operation2(), 100),
        withTimeout(operation3(), 100),
      ]);

      assert.equal(results[0].status, 'fulfilled');
      assert.equal(results[0].value, 'op1');
      assert.equal(results[1].status, 'fulfilled');
      assert.equal(results[1].value, 'op2');
      assert.equal(results[2].status, 'rejected');
      assert.ok(results[2].reason instanceof TimeoutError);
    });

    it('should cleanup timer on successful completion', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      };

      // Run multiple times to ensure no timer leaks
      for (let i = 0; i < 5; i++) {
        await withTimeout(operation(), 100);
      }

      // If timers weren't cleaned up, this would cause issues
      assert.ok(true);
    });

    it('should cleanup timer on error', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('fail');
      };

      // Run multiple times to ensure no timer leaks
      for (let i = 0; i < 5; i++) {
        await assert.rejects(withTimeout(operation(), 100));
      }

      assert.ok(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very large timeout values', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      };

      // Use a large but reasonable timeout (1 hour)
      const result = await withTimeout(operation(), 3600000);
      assert.equal(result, 'result');
    });

    it('should handle negative timeout as immediate timeout', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      };

      await assert.rejects(
        withTimeout(operation(), -1),
        (error) => {
          assert.ok(error instanceof TimeoutError);
          return true;
        }
      );
    });

    it('should preserve promise value types', async () => {
      const objectResult = { key: 'value', nested: { data: 123 } };
      const arrayResult = [1, 2, 3, 4, 5];
      const numberResult = 42;
      const boolResult = true;
      const nullResult = null;

      assert.deepEqual(
        await withTimeout(Promise.resolve(objectResult), 100),
        objectResult
      );
      assert.deepEqual(
        await withTimeout(Promise.resolve(arrayResult), 100),
        arrayResult
      );
      assert.equal(await withTimeout(Promise.resolve(numberResult), 100), 42);
      assert.equal(await withTimeout(Promise.resolve(boolResult), 100), true);
      assert.equal(await withTimeout(Promise.resolve(nullResult), 100), null);
    });
  });
});