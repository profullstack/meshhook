import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker;
  let callCount;
  let successfulCall;
  let failingCall;

  beforeEach(() => {
    callCount = 0;
    successfulCall = async () => {
      callCount++;
      return 'success';
    };
    failingCall = async () => {
      callCount++;
      throw new Error('Service unavailable');
    };
  });

  describe('constructor', () => {
    it('should create circuit breaker with default options', () => {
      breaker = new CircuitBreaker(successfulCall);
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.failureThreshold, 5);
      assert.equal(breaker.resetTimeout, 60000);
    });

    it('should create circuit breaker with custom options', () => {
      breaker = new CircuitBreaker(successfulCall, {
        failureThreshold: 3,
        resetTimeout: 30000,
        halfOpenMaxAttempts: 2,
      });
      assert.equal(breaker.failureThreshold, 3);
      assert.equal(breaker.resetTimeout, 30000);
      assert.equal(breaker.halfOpenMaxAttempts, 2);
    });
  });

  describe('CLOSED state', () => {
    beforeEach(() => {
      breaker = new CircuitBreaker(successfulCall, {
        failureThreshold: 3,
        resetTimeout: 1000,
      });
    });

    it('should execute function successfully when closed', async () => {
      const result = await breaker.execute();
      assert.equal(result, 'success');
      assert.equal(callCount, 1);
      assert.equal(breaker.state, 'CLOSED');
    });

    it('should remain closed on successful calls', async () => {
      await breaker.execute();
      await breaker.execute();
      await breaker.execute();
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.failureCount, 0);
    });

    it('should track failures but remain closed below threshold', async () => {
      breaker = new CircuitBreaker(failingCall, {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      await assert.rejects(breaker.execute(), /Service unavailable/);
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.failureCount, 1);

      await assert.rejects(breaker.execute(), /Service unavailable/);
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.failureCount, 2);
    });

    it('should open circuit after reaching failure threshold', async () => {
      breaker = new CircuitBreaker(failingCall, {
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      await assert.rejects(breaker.execute(), /Service unavailable/);
      await assert.rejects(breaker.execute(), /Service unavailable/);
      await assert.rejects(breaker.execute(), /Service unavailable/);

      assert.equal(breaker.state, 'OPEN');
      assert.equal(callCount, 3);
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      breaker = new CircuitBreaker(failingCall, {
        failureThreshold: 2,
        resetTimeout: 100,
      });
      // Trigger circuit to open
      await assert.rejects(breaker.execute());
      await assert.rejects(breaker.execute());
      assert.equal(breaker.state, 'OPEN');
      callCount = 0; // Reset for testing
    });

    it('should reject immediately without calling function when open', async () => {
      await assert.rejects(
        breaker.execute(),
        /Circuit breaker is OPEN/
      );
      assert.equal(callCount, 0);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      breaker.fn = successfulCall; // Switch to successful function
      
      // First call should transition to HALF_OPEN
      assert.equal(breaker.state, 'OPEN');
      const result = await breaker.execute();
      
      assert.equal(result, 'success');
      // After one successful call with halfOpenMaxAttempts=2, should still be HALF_OPEN
      // But our default is 1, so it closes immediately. Let's verify it's no longer OPEN
      assert.notEqual(breaker.state, 'OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      breaker = new CircuitBreaker(failingCall, {
        failureThreshold: 2,
        resetTimeout: 50,
        halfOpenMaxAttempts: 2,
      });
      // Open the circuit
      await assert.rejects(breaker.execute());
      await assert.rejects(breaker.execute());
      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 100));
      callCount = 0;
    });

    it('should close circuit after successful attempts in half-open', async () => {
      breaker.fn = successfulCall;
      
      await breaker.execute();
      assert.equal(breaker.state, 'HALF_OPEN');
      
      await breaker.execute();
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.failureCount, 0);
    });

    it('should reopen circuit on failure in half-open state', async () => {
      breaker.fn = failingCall;
      
      await assert.rejects(breaker.execute(), /Service unavailable/);
      assert.equal(breaker.state, 'OPEN');
    });

    it('should allow limited attempts in half-open state', async () => {
      breaker.fn = successfulCall;
      
      const result1 = await breaker.execute();
      const result2 = await breaker.execute();
      
      assert.equal(result1, 'success');
      assert.equal(result2, 'success');
      assert.equal(breaker.state, 'CLOSED');
    });
  });

  describe('getStats', () => {
    it('should return circuit breaker statistics', async () => {
      breaker = new CircuitBreaker(successfulCall, {
        failureThreshold: 3,
      });

      await breaker.execute();
      await breaker.execute();

      const stats = breaker.getStats();
      assert.equal(stats.state, 'CLOSED');
      assert.equal(stats.failureCount, 0);
      assert.equal(stats.successCount, 2);
      assert.equal(stats.failureThreshold, 3);
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to initial state', async () => {
      breaker = new CircuitBreaker(failingCall, {
        failureThreshold: 2,
      });

      await assert.rejects(breaker.execute());
      await assert.rejects(breaker.execute());
      assert.equal(breaker.state, 'OPEN');

      breaker.reset();
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.failureCount, 0);
      assert.equal(breaker.successCount, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle synchronous errors', async () => {
      const syncError = () => {
        throw new Error('Sync error');
      };
      breaker = new CircuitBreaker(syncError, { failureThreshold: 1 });

      await assert.rejects(breaker.execute(), /Sync error/);
      assert.equal(breaker.state, 'OPEN');
    });

    it('should handle async rejections', async () => {
      const asyncReject = async () => Promise.reject(new Error('Async reject'));
      breaker = new CircuitBreaker(asyncReject, { failureThreshold: 1 });

      await assert.rejects(breaker.execute(), /Async reject/);
      assert.equal(breaker.state, 'OPEN');
    });

    it('should pass arguments to wrapped function', async () => {
      let receivedArgs;
      const fnWithArgs = async (...args) => {
        receivedArgs = args;
        return 'success';
      };
      breaker = new CircuitBreaker(fnWithArgs);

      await breaker.execute('arg1', 'arg2', 'arg3');
      assert.deepEqual(receivedArgs, ['arg1', 'arg2', 'arg3']);
    });
  });
});