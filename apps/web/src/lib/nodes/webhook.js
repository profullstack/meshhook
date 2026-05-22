/**
 * Webhook Node Implementation
 * 
 * Implements webhook functionality with template variable substitution,
 * similar to http-call but optimized for webhook use cases.
 * 
 * Supports {{variable}} syntax in URL, headers, and body to reference
 * data from previous nodes (similar to n8n).
 * 
 * @example Basic outgoing webhook
 * const node = new WebhookNode({
 *   webhookType: 'outgoing',
 *   url: 'https://hooks.example.com/webhook',
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   bodyTemplate: { event: 'user.created', data: '{{user}}' }
 * });
 * 
 * const result = await node.execute({ user: { id: 123, name: 'John' } });
 * 
 * @example With template variables
 * const node = new WebhookNode({
 *   webhookType: 'outgoing',
 *   url: 'https://hooks.example.com/{{webhookId}}',
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer {{token}}' },
 *   bodyTemplate: {
 *     event: '{{eventType}}',
 *     user: '{{user.name}}',
 *     timestamp: '{{timestamp}}'
 *   }
 * });
 * 
 * const result = await node.execute({
 *   webhookId: 'abc123',
 *   token: 'secret',
 *   eventType: 'user.updated',
 *   user: { name: 'John' },
 *   timestamp: new Date().toISOString()
 * });
 */

/**
 * Custom error class for webhook errors
 */
export class WebhookError extends Error {
  /**
   * Create a webhook error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} request - Request details
   */
  constructor(message, statusCode, request) {
    super(message);
    this.name = 'WebhookError';
    this.statusCode = statusCode;
    this.request = request;
    Error.captureStackTrace?.(this, WebhookError);
  }
}

/**
 * Webhook Node
 * 
 * Executes webhook calls with template variable substitution
 */
export class WebhookNode {
  /**
   * Create a webhook node
   * @param {Object} config - Node configuration
   * @param {string} config.webhookType - Webhook type ('incoming' or 'outgoing')
   * @param {string} config.url - Webhook URL
   * @param {string} config.method - HTTP method (POST, PUT, PATCH)
   * @param {Object} config.headers - Request headers
   * @param {Object|string} config.bodyTemplate - Body template
   * @param {number} config.timeout - Request timeout in milliseconds
   * @param {Object} config.retryPolicy - Retry configuration
   */
  constructor(config) {
    if (!config.url) {
      throw new WebhookError('url is required', 0, {});
    }

    this.webhookType = config.webhookType || 'outgoing';
    this.url = config.url;
    this.method = config.method || 'POST';
    this.headers = config.headers || {};
    this.bodyTemplate = config.bodyTemplate;
    this.timeout = config.timeout || 30000; // 30 seconds default

    // Retry policy configuration (simpler than http-call)
    this.retryPolicy = {
      maxAttempts: config.retryPolicy?.maxAttempts ?? 2,
      initialDelay: config.retryPolicy?.initialDelay ?? 1000,
      backoffMultiplier: config.retryPolicy?.backoffMultiplier ?? 2,
      maxDelay: config.retryPolicy?.maxDelay ?? 10000,
      retryableStatusCodes: config.retryPolicy?.retryableStatusCodes ?? [
        408, 429, 500, 502, 503, 504,
      ],
    };
  }

  /**
   * Execute the webhook
   * 
   * @param {any} input - Input data from previous node (required for outgoing webhooks)
   * @returns {Promise<Object>} Response object with status, data, and headers
   * @throws {WebhookError} If webhook fails after all retries
   * 
   * @example Outgoing webhook with input
   * const result = await node.execute({ userId: 123, action: 'created' });
   * console.log(result.status, result.data);
   */
  async execute(input) {
    // For outgoing webhooks, input is typically required
    if (this.webhookType === 'outgoing' && !input) {
      console.warn('Outgoing webhook executed without input data');
    }

    let lastError;
    let attempt = 0;

    while (attempt < this.retryPolicy.maxAttempts) {
      attempt++;

      try {
        const response = await this._makeRequest(input);
        return response;
      } catch (error) {
        lastError = error;

        // Don't retry if it's the last attempt
        if (attempt >= this.retryPolicy.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (error instanceof WebhookError) {
          if (!this.retryPolicy.retryableStatusCodes.includes(error.statusCode)) {
            throw error; // Don't retry non-retryable status codes
          }
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryPolicy.initialDelay *
            Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1),
          this.retryPolicy.maxDelay
        );

        // Add jitter (±25%)
        const jitter = delay * 0.25 * (Math.random() * 2 - 1);
        const delayWithJitter = Math.max(0, delay + jitter);

        await new Promise((resolve) => setTimeout(resolve, delayWithJitter));
      }
    }

    throw lastError;
  }

  /**
   * Make the actual webhook request
   * @private
   * @param {any} input - Optional input data from previous node
   */
  async _makeRequest(input) {
    // Build URL with template substitution
    const url = this._buildUrl(input);

    // Build request options, passing input data
    const options = this._buildRequestOptions(input);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response
      return await this._handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new WebhookError(
          `Webhook timed out after ${this.timeout}ms`,
          0,
          { url: this.url, method: this.method }
        );
      }

      throw error;
    }
  }

  /**
   * Process template string with variable substitution
   * @private
   * @param {string} template - Template string with {{variable}} syntax
   * @param {any} data - Data object for variable substitution
   * @returns {string} Processed template
   */
  _processTemplate(template, data) {
    if (!template || typeof template !== 'string') {
      return template;
    }
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      const value = this._getValueByPath(data, trimmedPath);
      
      if (value === undefined || value === null) {
        return match; // Keep original if not found
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return String(value);
    });
  }

  /**
   * Get value from object by path string
   * @private
   * @param {any} obj - Source object
   * @param {string} path - Dot-notation path (e.g., 'user.name' or 'items[0].id')
   * @returns {any} Value at path or undefined
   */
  _getValueByPath(obj, path) {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Process object recursively for template substitution
   * @private
   * @param {any} obj - Object to process
   * @param {any} data - Data for substitution
   * @returns {any} Processed object
   */
  _processObjectTemplates(obj, data) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this._processTemplate(obj, data);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._processObjectTemplates(item, data));
    }
    
    if (typeof obj === 'object') {
      const processed = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this._processObjectTemplates(value, data);
      }
      return processed;
    }
    
    return obj;
  }

  /**
   * Build URL with template substitution
   * @private
   * @param {any} input - Optional input data for template substitution
   */
  _buildUrl(input) {
    // Process URL template if input is provided
    return input ? this._processTemplate(this.url, input) : this.url;
  }

  /**
   * Build request options
   * @private
   * @param {any} input - Optional input data from previous node
   */
  _buildRequestOptions(input) {
    const options = {
      method: this.method,
      headers: {},
    };

    // Process headers with template substitution if input is provided
    if (input) {
      for (const [key, value] of Object.entries(this.headers)) {
        options.headers[key] = this._processTemplate(String(value), input);
      }
    } else {
      options.headers = { ...this.headers };
    }

    // Determine body to use
    let bodyToUse;
    
    if (this.bodyTemplate && input) {
      // Process body template with input data
      bodyToUse = this._processObjectTemplates(this.bodyTemplate, input);
    } else if (this.bodyTemplate) {
      // Use body template as-is
      bodyToUse = this.bodyTemplate;
    } else if (input) {
      // Use input directly as body
      bodyToUse = input;
    }

    // Add body for methods that support it
    if (bodyToUse && ['POST', 'PUT', 'PATCH'].includes(this.method)) {
      if (typeof bodyToUse === 'object') {
        options.body = JSON.stringify(bodyToUse);
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      } else {
        options.body = bodyToUse;
      }
    }

    return options;
  }

  /**
   * Handle webhook response
   * @private
   */
  async _handleResponse(response) {
    const result = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    };

    // Handle error responses
    if (!response.ok) {
      const errorBody = await response.text();
      throw new WebhookError(
        `Webhook failed: HTTP ${response.status}: ${response.statusText}`,
        response.status,
        {
          url: this.url,
          method: this.method,
          body: errorBody,
        }
      );
    }

    // Parse response
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result.data = await response.json();
      } else {
        result.data = await response.text();
      }
    } catch (error) {
      throw new WebhookError(
        `Failed to parse webhook response: ${error.message}`,
        response.status,
        { url: this.url, method: this.method }
      );
    }

    return result;
  }

  /**
   * Validate the node configuration
   * 
   * @returns {Object} Validation result with valid flag and optional errors
   */
  validate() {
    const errors = [];

    // Validate URL
    try {
      new URL(this.url);
    } catch (error) {
      errors.push(`Invalid URL: ${this.url}`);
    }

    // Validate HTTP method
    const validMethods = ['POST', 'PUT', 'PATCH'];
    if (!validMethods.includes(this.method.toUpperCase())) {
      errors.push(`Invalid HTTP method for webhook: ${this.method}. Must be POST, PUT, or PATCH.`);
    }

    // Validate webhook type
    const validTypes = ['incoming', 'outgoing'];
    if (!validTypes.includes(this.webhookType)) {
      errors.push(`Invalid webhook type: ${this.webhookType}. Must be 'incoming' or 'outgoing'.`);
    }

    // Validate timeout
    if (this.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    // Validate retry policy
    if (this.retryPolicy.maxAttempts < 1) {
      errors.push('maxAttempts must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get webhook configuration
   * 
   * @returns {Object} Webhook configuration
   */
  getConfig() {
    return {
      webhookType: this.webhookType,
      url: this.url,
      method: this.method,
      headers: this.headers,
      bodyTemplate: this.bodyTemplate,
      timeout: this.timeout,
      retryPolicy: this.retryPolicy,
    };
  }

  /**
   * Get node metadata
   * 
   * @returns {Object} Node metadata
   */
  getMetadata() {
    return {
      type: 'webhook',
      webhookType: this.webhookType,
      url: this.url,
      method: this.method,
      timeout: this.timeout,
      retryPolicy: this.retryPolicy,
    };
  }
}

/**
 * Create a webhook node
 * 
 * @param {Object} config - Node configuration
 * @returns {WebhookNode} New webhook node instance
 */
export function createWebhookNode(config) {
  return new WebhookNode(config);
}

/**
 * Webhook types
 */
export const WEBHOOK_TYPES = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
};

/**
 * Common HTTP methods for webhooks
 */
export const WEBHOOK_METHODS = {
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
};

/**
 * Default retry policy for webhooks
 */
export const DEFAULT_WEBHOOK_RETRY_POLICY = {
  maxAttempts: 2,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};