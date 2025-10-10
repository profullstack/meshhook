// Test file for RetryStrategy
// Testing Framework: Mocha with Chai
// Issue #92: Add retry logic with exponential backoff + jitter

import { expect } from 'chai';
import { RetryStrategy, calculateBackoff, shouldRetry } from './retry-strategy.js';

describe('RetryStrategy', () => {
  describe('calculateBackoff', () => {
    it('should calculate exponential backoff for attempt 1', () => {
      const backoff = calculateBackoff(1, 1000, 300000);
      expect(backoff).to.be.at.least(1000);
      expect(backoff).to.be.at.most(2000); // base * 2^0 + jitter
    });

    it('should calculate exponential backoff for attempt 2', () => {
      const backoff = calculateBackoff(2, 1000, 300000);
      expect(backoff).to.be.at.least(2000);
      expect(backoff).to.be.at.most(4000); // base * 2^1 + jitter
    });

    it('should calculate exponential backoff for attempt 3', () => {
      const backoff = calculateBackoff(3, 1000, 300000);
      expect(backoff).to.be.at.least(4000);
      expect(backoff).to.be.at.most(8000); // base * 2^2 + jitter
    });

    it('should respect maximum backoff limit', () => {
      const backoff = calculateBackoff(10, 1000, 10000);
      expect(backoff).to.be.at.most(10000);
    });

    it('should add jitter to prevent thundering herd', () => {
      const backoffs = [];
      for (let i = 0; i < 10; i++) {
        backoffs.push(calculateBackoff(3, 1000, 300000));
      }
      
      // Check that not all backoffs are identical (jitter is working)
      const uniqueBackoffs = new Set(backoffs);
      expect(uniqueBackoffs.size).to.be.greaterThan(1);
    });

    it('should handle attempt 0 gracefully', () => {
      const backoff = calculateBackoff(0, 1000, 300000);
      expect(backoff).to.be.at.least(1000);
    });

    it('should handle negative attempts gracefully', () => {
      const backoff = calculateBackoff(-1, 1000, 300000);
      expect(backoff).to.be.at.least(1000);
    });
  });

  describe('shouldRetry', () => {
    it('should allow retry when attempts < max attempts', () => {
      expect(shouldRetry(1, 5)).to.be.true;
      expect(shouldRetry(4, 5)).to.be.true;
    });

    it('should not allow retry when attempts >= max attempts', () => {
      expect(shouldRetry(5, 5)).to.be.false;
      expect(shouldRetry(6, 5)).to.be.false;
    });

    it('should handle edge case of 0 max attempts', () => {
      expect(shouldRetry(0, 0)).to.be.false;
      expect(shouldRetry(1, 0)).to.be.false;
    });

    it('should handle negative attempts', () => {
      expect(shouldRetry(-1, 5)).to.be.true;
    });
  });

  describe('RetryStrategy class', () => {
    let strategy;

    beforeEach(() => {
      strategy = new RetryStrategy({
        baseDelayMs: 1000,
        maxDelayMs: 60000,
        maxAttempts: 5,
      });
    });

    describe('constructor', () => {
      it('should create instance with default config', () => {
        const defaultStrategy = new RetryStrategy();
        expect(defaultStrategy.config.baseDelayMs).to.equal(1000);
        expect(defaultStrategy.config.maxDelayMs).to.equal(300000);
        expect(defaultStrategy.config.maxAttempts).to.equal(5);
      });

      it('should create instance with custom config', () => {
        expect(strategy.config.baseDelayMs).to.equal(1000);
        expect(strategy.config.maxDelayMs).to.equal(60000);
        expect(strategy.config.maxAttempts).to.equal(5);
      });

      it('should merge partial config with defaults', () => {
        const partialStrategy = new RetryStrategy({ maxAttempts: 3 });
        expect(partialStrategy.config.baseDelayMs).to.equal(1000);
        expect(partialStrategy.config.maxAttempts).to.equal(3);
      });
    });

    describe('getNextDelay', () => {
      it('should return delay for first attempt', () => {
        const delay = strategy.getNextDelay(1);
        expect(delay).to.be.at.least(1000);
        expect(delay).to.be.at.most(2000);
      });

      it('should return increasing delays for subsequent attempts', () => {
        const delay1 = strategy.getNextDelay(1);
        const delay2 = strategy.getNextDelay(2);
        const delay3 = strategy.getNextDelay(3);
        
        // Due to jitter, we can't guarantee strict ordering,
        // but the base should increase
        expect(delay2).to.be.at.least(2000);
        expect(delay3).to.be.at.least(4000);
      });

      it('should respect max delay', () => {
        const delay = strategy.getNextDelay(10);
        expect(delay).to.be.at.most(60000);
      });
    });

    describe('canRetry', () => {
      it('should return true when retries available', () => {
        expect(strategy.canRetry(1)).to.be.true;
        expect(strategy.canRetry(4)).to.be.true;
      });

      it('should return false when max attempts reached', () => {
        expect(strategy.canRetry(5)).to.be.false;
        expect(strategy.canRetry(6)).to.be.false;
      });
    });

    describe('getDelaySeconds', () => {
      it('should return delay in seconds', () => {
        const delaySeconds = strategy.getDelaySeconds(1);
        expect(delaySeconds).to.be.at.least(1);
        expect(delaySeconds).to.be.at.most(2);
      });

      it('should round to nearest second', () => {
        const delaySeconds = strategy.getDelaySeconds(1);
        expect(Number.isInteger(delaySeconds)).to.be.true;
      });
    });

    describe('shouldMoveToDeadLetter', () => {
      it('should return false when retries available', () => {
        expect(strategy.shouldMoveToDeadLetter(1)).to.be.false;
        expect(strategy.shouldMoveToDeadLetter(4)).to.be.false;
      });

      it('should return true when max attempts exceeded', () => {
        expect(strategy.shouldMoveToDeadLetter(5)).to.be.true;
        expect(strategy.shouldMoveToDeadLetter(6)).to.be.true;
      });
    });

    describe('getRetryInfo', () => {
      it('should return complete retry information', () => {
        const info = strategy.getRetryInfo(2);
        
        expect(info).to.have.property('attempt');
        expect(info).to.have.property('maxAttempts');
        expect(info).to.have.property('canRetry');
        expect(info).to.have.property('delayMs');
        expect(info).to.have.property('delaySeconds');
        expect(info).to.have.property('shouldMoveToDeadLetter');
        
        expect(info.attempt).to.equal(2);
        expect(info.maxAttempts).to.equal(5);
        expect(info.canRetry).to.be.true;
        expect(info.shouldMoveToDeadLetter).to.be.false;
      });

      it('should indicate when job should move to DLQ', () => {
        const info = strategy.getRetryInfo(5);
        
        expect(info.canRetry).to.be.false;
        expect(info.shouldMoveToDeadLetter).to.be.true;
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very large attempt numbers', () => {
      const backoff = calculateBackoff(100, 1000, 300000);
      expect(backoff).to.equal(300000); // Should cap at max
    });

    it('should handle zero base delay', () => {
      const backoff = calculateBackoff(1, 0, 300000);
      expect(backoff).to.be.at.least(0);
    });

    it('should handle equal base and max delay', () => {
      const backoff = calculateBackoff(5, 1000, 1000);
      expect(backoff).to.equal(1000);
    });
  });

  describe('jitter distribution', () => {
    it('should produce jitter within expected range', () => {
      const samples = 1000;
      const backoffs = [];
      
      for (let i = 0; i < samples; i++) {
        backoffs.push(calculateBackoff(1, 1000, 300000));
      }
      
      const min = Math.min(...backoffs);
      const max = Math.max(...backoffs);
      
      // Jitter should be between base and base * 2
      expect(min).to.be.at.least(1000);
      expect(max).to.be.at.most(2000);
      
      // Check distribution is reasonably spread
      const range = max - min;
      expect(range).to.be.greaterThan(500); // At least 50% of possible range
    });
  });
});