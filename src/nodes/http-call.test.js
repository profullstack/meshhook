import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HttpCallNode, HttpCallError } from './http-call.js';

describe('HttpCallNode', () => {
  let node;
  let mockFetch;

  beforeEach(() => {
    // Mock global fetch
    mockFetch = mock.fn(async (url, options) => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true, data: 'test' }),
        text: async () => JSON.stringify({ success: true, data: 'test' }),
      };
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('HttpCallError', () => {
    it('should create http call error with details', () => {
      const error = new HttpCallError('Request failed', 500, {
        url: 'https://api.example.com',
        method: 'POST',
      });
      assert.equal(error.name, 'HttpCallError');
      assert.equal(error.message, 'Request failed');
      assert.equal(error.statusCode, 500);
      assert.deepEqual(error.request, {
        url: 'https://api.example.com',
        method: 'POST',
      });
    });
  });

  describe('constructor', () => {
    it('should create http call node with minimal config', () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'GET',
      });
      assert.equal(node.url, 'https://api.example.com/data');
      assert.equal(node.method, 'GET');
    });

    it('should create http call node with full config', () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { key: 'value' },
        timeout: 5000,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      });
      assert.equal(node.url, 'https://api.example.com/data');
      assert.equal(node.method, 'POST');
      assert.deepEqual(node.headers, { 'Content-Type': 'application/json' });
      assert.deepEqual(node.body, { key: 'value' });
      assert.equal(node.timeout, 5000);
      assert.equal(node.retryPolicy.maxAttempts, 3);
    });

    it('should throw error if URL is missing', () => {
      assert.throws(
        () => new HttpCallNode({ method: 'GET' }),
        /url is required/
      );
    });

    it('should default to GET method', () => {
      node = new HttpCallNode({ url: 'https://api.example.com' });
      assert.equal(node.method, 'GET');
    });
  });

  describe('execute', () => {
    it('should execute GET request successfully', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      const result = await node.execute();
      
      assert.equal(result.status, 200);
      assert.equal(result.ok, true);
      assert.deepEqual(result.data, { success: true, data: 'test' });
      assert.equal(mockFetch.mock.calls.length, 1);
    });

    it('should execute POST request with body', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { name: 'test', value: 123 },
      });

      await node.execute();
      
      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[0], 'https://api.example.com/data');
      assert.equal(call.arguments[1].method, 'POST');
      assert.equal(
        call.arguments[1].body,
        JSON.stringify({ name: 'test', value: 123 })
      );
    });

    it('should include custom headers', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      });

      await node.execute();
      
      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer token123');
      assert.equal(call.arguments[1].headers['X-Custom-Header'], 'value');
    });

    it('should handle query parameters', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        queryParams: {
          page: 1,
          limit: 10,
          filter: 'active',
        },
      });

      await node.execute();
      
      const call = mockFetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('page'), '1');
      assert.equal(url.searchParams.get('limit'), '10');
      assert.equal(url.searchParams.get('filter'), 'active');
    });

    it('should retry on failure', async () => {
      let attemptCount = 0;
      mockFetch = mock.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Map(),
            text: async () => 'Server error',
          };
        }
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
        };
      });
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        retryPolicy: {
          maxAttempts: 3,
          initialDelay: 10,
          backoffMultiplier: 1,
        },
      });

      const result = await node.execute();
      
      assert.equal(result.status, 200);
      assert.equal(mockFetch.mock.calls.length, 3);
    });

    it('should throw error after max retries', async () => {
      mockFetch = mock.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map(),
        text: async () => 'Server error',
      }));
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        retryPolicy: {
          maxAttempts: 2,
          initialDelay: 10,
        },
      });

      await assert.rejects(
        node.execute(),
        (error) => {
          assert.ok(error instanceof HttpCallError);
          assert.equal(error.statusCode, 500);
          return true;
        }
      );
      
      assert.equal(mockFetch.mock.calls.length, 2);
    });

    it('should handle timeout', async () => {
      // Create a mock that never resolves within the timeout
      mockFetch = mock.fn(async (url, options) => {
        // Wait for the abort signal
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
          // Never resolve naturally - let timeout abort it
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              headers: new Map(),
              json: async () => ({ data: 'test' }),
            });
          }, 1000);
        });
      });
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        timeout: 50,
      });

      await assert.rejects(
        node.execute(),
        /timed out/i
      );
    });

    it('should handle different response types', async () => {
      // Test JSON response
      node = new HttpCallNode({
        url: 'https://api.example.com/json',
        responseType: 'json',
      });
      let result = await node.execute();
      assert.deepEqual(result.data, { success: true, data: 'test' });

      // Test text response
      mockFetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'plain text response',
      }));
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/text',
        responseType: 'text',
      });
      result = await node.execute();
      assert.equal(result.data, 'plain text response');
    });

    it('should use input data from previous node as request body', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
      });

      const inputData = {
        userId: 123,
        action: 'update',
        metadata: { source: 'workflow' },
      };

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].method, 'POST');
      assert.equal(
        call.arguments[1].body,
        JSON.stringify(inputData)
      );
      assert.equal(
        call.arguments[1].headers['Content-Type'],
        'application/json'
      );
    });

    it('should prioritize input data over configured body', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { configured: 'body' },
      });

      const inputData = { input: 'data', priority: 'high' };

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      assert.equal(
        call.arguments[1].body,
        JSON.stringify(inputData)
      );
      // Should NOT contain configured body
      assert.ok(!call.arguments[1].body.includes('configured'));
    });

    it('should use configured body when no input provided', async () => {
      const configuredBody = { configured: 'body', value: 42 };
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: configuredBody,
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      assert.equal(
        call.arguments[1].body,
        JSON.stringify(configuredBody)
      );
    });

    it('should handle string input data', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
      });

      const inputData = 'plain text payload';

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].body, inputData);
    });

    it('should handle null input (use configured body)', async () => {
      const configuredBody = { key: 'value' };
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: configuredBody,
      });

      await node.execute(null);

      const call = mockFetch.mock.calls[0];
      assert.equal(
        call.arguments[1].body,
        JSON.stringify(configuredBody)
      );
    });

    it('should work with GET requests ignoring input data', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      const inputData = { should: 'be ignored' };

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].method, 'GET');
      // GET requests should not have a body
      assert.equal(call.arguments[1].body, undefined);
    });

    it('should handle complex nested input data', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
      });

      const inputData = {
        user: {
          id: 123,
          profile: {
            name: 'Alice',
            settings: { theme: 'dark' },
          },
        },
        items: [1, 2, 3],
        timestamp: new Date().toISOString(),
      };

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.deepEqual(sentBody, inputData);
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
      });
      const result = node.validate();
      assert.equal(result.valid, true);
    });

    it('should detect invalid URL', () => {
      node = new HttpCallNode({
        url: 'not-a-valid-url',
      });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('should detect invalid method', () => {
      node = new HttpCallNode({
        url: 'https://api.example.com',
        method: 'INVALID',
      });
      const result = node.validate();
      assert.equal(result.valid, false);
    });
  });

  describe('getRequestConfig', () => {
    it('should return complete request configuration', () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { key: 'value' },
      });

      const config = node.getRequestConfig();
      assert.equal(config.url, 'https://api.example.com/data');
      assert.equal(config.method, 'POST');
      assert.ok(config.headers);
      assert.ok(config.body);
    });
  });
});