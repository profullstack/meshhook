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

    it('should return raw XML when response Content-Type is text/xml', async () => {
      const xmlResponse = '<?xml version="1.0"?><root><item>test</item></root>';
      
      mockFetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/xml']]),
        text: async () => xmlResponse,
      }));
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/xml',
        responseType: 'json', // Even with json responseType, should respect actual Content-Type
      });
      
      const result = await node.execute();
      assert.equal(result.data, xmlResponse);
    });

    it('should return raw XML when response Content-Type is application/xml', async () => {
      const xmlResponse = '<?xml version="1.0"?><root><item>test</item></root>';
      
      mockFetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/xml']]),
        text: async () => xmlResponse,
      }));
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/xml',
      });
      
      const result = await node.execute();
      assert.equal(result.data, xmlResponse);
    });

    it('should return raw RSS when response Content-Type is application/rss+xml', async () => {
      const rssResponse = '<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title></channel></rss>';
      
      mockFetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/rss+xml']]),
        text: async () => rssResponse,
      }));
      global.fetch = mockFetch;

      node = new HttpCallNode({
        url: 'https://api.example.com/rss',
      });
      
      const result = await node.execute();
      assert.equal(result.data, rssResponse);
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

    it('should process configured body as template with input data', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: {
          configured: 'body',
          inputValue: '{{input}}',
          priority: '{{priority}}'
        },
      });

      const inputData = { input: 'data', priority: 'high' };

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      
      // Configured body should be processed with input data as template variables
      assert.equal(sentBody.configured, 'body');
      assert.equal(sentBody.inputValue, 'data');
      assert.equal(sentBody.priority, 'high');
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

    it('should use input as body when no configured body', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        // No body configured
      });

      const inputData = { input: 'data', priority: 'high' };
      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      assert.equal(
        call.arguments[1].body,
        JSON.stringify(inputData)
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
    it('should send XML body with text/xml Content-Type without JSON stringifying', async () => {
      const xmlBody = '<?xml version="1.0"?><root><item>test</item></root>';
      
      node = new HttpCallNode({
        url: 'https://api.example.com/xml',
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
        },
        body: xmlBody,
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Content-Type'], 'text/xml');
      assert.equal(call.arguments[1].body, xmlBody);
      // Should NOT be JSON stringified
      assert.ok(!call.arguments[1].body.startsWith('"'));
    });

    it('should send XML body with application/xml Content-Type', async () => {
      const xmlBody = '<?xml version="1.0"?><root><item>test</item></root>';
      
      node = new HttpCallNode({
        url: 'https://api.example.com/xml',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xmlBody,
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Content-Type'], 'application/xml');
      assert.equal(call.arguments[1].body, xmlBody);
    });

    it('should send plain text body with text/plain Content-Type', async () => {
      const textBody = 'This is plain text content';
      
      node = new HttpCallNode({
        url: 'https://api.example.com/text',
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: textBody,
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Content-Type'], 'text/plain');
      assert.equal(call.arguments[1].body, textBody);
    });

    it('should still JSON stringify objects when Content-Type is application/json', async () => {
      const jsonBody = { key: 'value', nested: { data: 123 } };
      
      node = new HttpCallNode({
        url: 'https://api.example.com/json',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonBody,
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Content-Type'], 'application/json');
      assert.equal(call.arguments[1].body, JSON.stringify(jsonBody));
    });
      assert.deepEqual(sentBody, inputData);
    });
  });

  describe('template substitution', () => {
    it('should substitute variables in URL', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/users/{{userId}}/posts/{{postId}}',
        method: 'GET',
      });

      await node.execute({ userId: 123, postId: 456 });

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[0], 'https://api.example.com/users/123/posts/456');
    });

    it('should substitute variables in headers', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{token}}',
          'X-User-ID': '{{userId}}',
        },
      });

      await node.execute({ token: 'abc123', userId: 789 });

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer abc123');
      assert.equal(call.arguments[1].headers['X-User-ID'], '789');
    });

    it('should substitute variables in body', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: {
          name: '{{user.name}}',
          email: '{{user.email}}',
          age: '{{user.age}}',
        },
      });

      await node.execute({
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
      });

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.name, 'John Doe');
      assert.equal(sentBody.email, 'john@example.com');
      assert.equal(sentBody.age, '30');
    });

    it('should substitute nested object variables', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: {
          user: '{{user.profile.name}}',
          setting: '{{user.profile.settings.theme}}',
        },
      });

      await node.execute({
        user: {
          profile: {
            name: 'Alice',
            settings: { theme: 'dark' },
          },
        },
      });

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.user, 'Alice');
      assert.equal(sentBody.setting, 'dark');
    });

    it('should substitute array access variables', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: {
          firstItem: '{{items[0]}}',
          secondName: '{{users[1].name}}',
        },
      });

      await node.execute({
        items: ['apple', 'banana', 'cherry'],
        users: [
          { name: 'Alice' },
          { name: 'Bob' },
        ],
      });

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.firstItem, 'apple');
      assert.equal(sentBody.secondName, 'Bob');
    });

    it('should keep original placeholder if variable not found', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/users/{{userId}}',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{token}}',
        },
        body: {
          name: '{{name}}',
          missing: '{{notFound}}',
        },
      });

      await node.execute({ userId: 123, token: 'abc', name: 'John' });

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[0], 'https://api.example.com/users/123');
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer abc');
      
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.name, 'John');
      assert.equal(sentBody.missing, '{{notFound}}');
    });

    it('should handle query parameters with templates', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/search',
        method: 'GET',
        queryParams: {
          q: '{{searchTerm}}',
          limit: '{{pageSize}}',
          userId: '{{user.id}}',
        },
      });

      await node.execute({
        searchTerm: 'test query',
        pageSize: 10,
        user: { id: 456 },
      });

      const call = mockFetch.mock.calls[0];
      const url = new URL(call.arguments[0]);
      assert.equal(url.searchParams.get('q'), 'test query');
      assert.equal(url.searchParams.get('limit'), '10');
      assert.equal(url.searchParams.get('userId'), '456');
    });

    it('should work without input (no template substitution)', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/users/{{userId}}',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{token}}',
        },
        body: {
          name: '{{name}}',
        },
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      // Templates should remain as-is without input
      assert.equal(call.arguments[0], 'https://api.example.com/users/{{userId}}');
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer {{token}}');
      
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.name, '{{name}}');
    });

    it('should stringify object values in templates', async () => {
      node = new HttpCallNode({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: {
          userData: '{{user}}',
        },
      });

      await node.execute({
        user: { name: 'John', age: 30 },
      });

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.userData, '{"name":"John","age":30}');
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