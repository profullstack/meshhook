import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { WebhookNode, WebhookError, WEBHOOK_TYPES, WEBHOOK_METHODS } from './webhook.js';

describe('WebhookNode', () => {
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
        json: async () => ({ success: true, webhookReceived: true }),
        text: async () => JSON.stringify({ success: true, webhookReceived: true }),
      };
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('WebhookError', () => {
    it('should create webhook error with details', () => {
      const error = new WebhookError('Webhook failed', 500, {
        url: 'https://hooks.example.com',
        method: 'POST',
      });
      assert.equal(error.name, 'WebhookError');
      assert.equal(error.message, 'Webhook failed');
      assert.equal(error.statusCode, 500);
      assert.deepEqual(error.request, {
        url: 'https://hooks.example.com',
        method: 'POST',
      });
    });
  });

  describe('constructor', () => {
    it('should create webhook node with minimal config', () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
      });
      assert.equal(node.url, 'https://hooks.example.com/webhook');
      assert.equal(node.method, 'POST');
      assert.equal(node.webhookType, 'outgoing');
    });

    it('should create webhook node with full config', () => {
      node = new WebhookNode({
        webhookType: 'outgoing',
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: { event: 'test', data: '{{data}}' },
        timeout: 5000,
        retryPolicy: {
          maxAttempts: 2,
          initialDelay: 500,
        },
      });
      assert.equal(node.url, 'https://hooks.example.com/webhook');
      assert.equal(node.method, 'POST');
      assert.equal(node.webhookType, 'outgoing');
      assert.deepEqual(node.headers, { 'Content-Type': 'application/json' });
      assert.deepEqual(node.bodyTemplate, { event: 'test', data: '{{data}}' });
      assert.equal(node.timeout, 5000);
      assert.equal(node.retryPolicy.maxAttempts, 2);
    });

    it('should throw error if URL is missing', () => {
      assert.throws(
        () => new WebhookNode({ method: 'POST' }),
        /url is required/
      );
    });

    it('should default to POST method', () => {
      node = new WebhookNode({ url: 'https://hooks.example.com' });
      assert.equal(node.method, 'POST');
    });

    it('should default to outgoing webhook type', () => {
      node = new WebhookNode({ url: 'https://hooks.example.com' });
      assert.equal(node.webhookType, 'outgoing');
    });
  });

  describe('execute', () => {
    it('should execute webhook successfully', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
      });

      const result = await node.execute({ event: 'test' });
      
      assert.equal(result.status, 200);
      assert.equal(result.ok, true);
      assert.deepEqual(result.data, { success: true, webhookReceived: true });
      assert.equal(mockFetch.mock.calls.length, 1);
    });

    it('should execute webhook with body template', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        bodyTemplate: {
          event: 'user.created',
          userId: '{{userId}}',
          name: '{{user.name}}',
        },
      });

      await node.execute({
        userId: 123,
        user: { name: 'John Doe' },
      });
      
      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[0], 'https://hooks.example.com/webhook');
      assert.equal(call.arguments[1].method, 'POST');
      
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.event, 'user.created');
      assert.equal(sentBody.userId, '123');
      assert.equal(sentBody.name, 'John Doe');
    });

    it('should include custom headers', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Webhook-Secret': 'secret',
        },
      });

      await node.execute({ data: 'test' });
      
      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer token123');
      assert.equal(call.arguments[1].headers['X-Webhook-Secret'], 'secret');
    });

    it('should retry on failure', async () => {
      let attemptCount = 0;
      mockFetch = mock.fn(async () => {
        attemptCount++;
        if (attemptCount < 2) {
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

      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        retryPolicy: {
          maxAttempts: 2,
          initialDelay: 10,
          backoffMultiplier: 1,
        },
      });

      const result = await node.execute({ data: 'test' });
      
      assert.equal(result.status, 200);
      assert.equal(mockFetch.mock.calls.length, 2);
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

      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        retryPolicy: {
          maxAttempts: 2,
          initialDelay: 10,
        },
      });

      await assert.rejects(
        node.execute({ data: 'test' }),
        (error) => {
          assert.ok(error instanceof WebhookError);
          assert.equal(error.statusCode, 500);
          return true;
        }
      );
      
      assert.equal(mockFetch.mock.calls.length, 2);
    });

    it('should handle timeout', async () => {
      mockFetch = mock.fn(async (url, options) => {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
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

      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        timeout: 50,
      });

      await assert.rejects(
        node.execute({ data: 'test' }),
        /timed out/i
      );
    });

    it('should warn when outgoing webhook has no input', async () => {
      node = new WebhookNode({
        webhookType: 'outgoing',
        url: 'https://hooks.example.com/webhook',
      });

      // Should not throw, just warn
      await node.execute();
      assert.equal(mockFetch.mock.calls.length, 1);
    });
  });

  describe('template substitution', () => {
    it('should substitute variables in URL', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/{{webhookId}}/{{eventType}}',
        method: 'POST',
      });

      await node.execute({ webhookId: 'abc123', eventType: 'user.created' });

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[0], 'https://hooks.example.com/abc123/user.created');
    });

    it('should substitute variables in headers', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{token}}',
          'X-Webhook-ID': '{{webhookId}}',
        },
      });

      await node.execute({ token: 'secret123', webhookId: 'hook-456' });

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer secret123');
      assert.equal(call.arguments[1].headers['X-Webhook-ID'], 'hook-456');
    });

    it('should substitute variables in body template', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        bodyTemplate: {
          event: '{{eventType}}',
          user: {
            id: '{{user.id}}',
            name: '{{user.name}}',
          },
          timestamp: '{{timestamp}}',
        },
      });

      await node.execute({
        eventType: 'user.updated',
        user: { id: 123, name: 'Jane Doe' },
        timestamp: '2024-01-01T00:00:00Z',
      });

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.event, 'user.updated');
      assert.equal(sentBody.user.id, '123');
      assert.equal(sentBody.user.name, 'Jane Doe');
      assert.equal(sentBody.timestamp, '2024-01-01T00:00:00Z');
    });

    it('should substitute nested object variables', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        bodyTemplate: {
          userName: '{{user.profile.name}}',
          userTheme: '{{user.profile.settings.theme}}',
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
      assert.equal(sentBody.userName, 'Alice');
      assert.equal(sentBody.userTheme, 'dark');
    });

    it('should substitute array access variables', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        bodyTemplate: {
          firstItem: '{{items[0]}}',
          secondUser: '{{users[1].name}}',
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
      assert.equal(sentBody.secondUser, 'Bob');
    });

    it('should keep original placeholder if variable not found', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/{{webhookId}}',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{token}}',
        },
        bodyTemplate: {
          event: '{{eventType}}',
          missing: '{{notFound}}',
        },
      });

      await node.execute({ webhookId: 'abc', token: 'secret', eventType: 'test' });

      const call = mockFetch.mock.calls[0];
      assert.equal(call.arguments[0], 'https://hooks.example.com/abc');
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer secret');
      
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.event, 'test');
      assert.equal(sentBody.missing, '{{notFound}}');
    });

    it('should work without input (no template substitution)', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/{{webhookId}}',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{token}}',
        },
        bodyTemplate: {
          event: '{{eventType}}',
        },
      });

      await node.execute();

      const call = mockFetch.mock.calls[0];
      // Templates should remain as-is without input
      assert.equal(call.arguments[0], 'https://hooks.example.com/{{webhookId}}');
      assert.equal(call.arguments[1].headers['Authorization'], 'Bearer {{token}}');
      
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.equal(sentBody.event, '{{eventType}}');
    });

    it('should stringify object values in templates', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        bodyTemplate: {
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

    it('should use input directly as body when no template', async () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        // No bodyTemplate
      });

      const inputData = {
        event: 'user.created',
        userId: 123,
        data: { name: 'John' },
      };

      await node.execute(inputData);

      const call = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(call.arguments[1].body);
      assert.deepEqual(sentBody, inputData);
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
      });
      const result = node.validate();
      assert.equal(result.valid, true);
    });

    it('should detect invalid URL', () => {
      node = new WebhookNode({
        url: 'not-a-valid-url',
      });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('should detect invalid method', () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com',
        method: 'GET', // GET not allowed for webhooks
      });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Invalid HTTP method')));
    });

    it('should detect invalid webhook type', () => {
      node = new WebhookNode({
        url: 'https://hooks.example.com',
        webhookType: 'invalid',
      });
      const result = node.validate();
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Invalid webhook type')));
    });
  });

  describe('getConfig', () => {
    it('should return complete webhook configuration', () => {
      node = new WebhookNode({
        webhookType: 'outgoing',
        url: 'https://hooks.example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        bodyTemplate: { event: 'test' },
      });

      const config = node.getConfig();
      assert.equal(config.webhookType, 'outgoing');
      assert.equal(config.url, 'https://hooks.example.com/webhook');
      assert.equal(config.method, 'POST');
      assert.ok(config.headers);
      assert.ok(config.bodyTemplate);
    });
  });

  describe('constants', () => {
    it('should export WEBHOOK_TYPES', () => {
      assert.equal(WEBHOOK_TYPES.INCOMING, 'incoming');
      assert.equal(WEBHOOK_TYPES.OUTGOING, 'outgoing');
    });

    it('should export WEBHOOK_METHODS', () => {
      assert.equal(WEBHOOK_METHODS.POST, 'POST');
      assert.equal(WEBHOOK_METHODS.PUT, 'PUT');
      assert.equal(WEBHOOK_METHODS.PATCH, 'PATCH');
    });
  });
});