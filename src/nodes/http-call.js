/**
 * HTTP Call Node Implementation
 *
 * Implements HTTP requests with comprehensive configuration,
 * retry policies, response processing, and template variable substitution.
 *
 * Supports {{variable}} syntax in URL, headers, and body to reference
 * data from previous nodes (similar to n8n).
 *
 * @example Basic usage
 * const node = new HttpCallNode({
 *   url: 'https://api.example.com/data',
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer token' },
 *   body: { key: 'value' },
 *   timeout: 5000,
 *   retryPolicy: {
 *     maxAttempts: 3,
 *     initialDelay: 1000,
 *     backoffMultiplier: 2
 *   }
 * });
 *
 * const result = await node.execute();
 *
 * @example With template variables
 * const node = new HttpCallNode({
 *   url: 'https://api.example.com/users/{{userId}}',
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer {{token}}' },
 *   body: { name: '{{name}}', email: '{{email}}' }
 * });
 *
 * const result = await node.execute({ userId: 123, token: 'abc', name: 'John', email: 'john@example.com' });
 */

/**
 * Custom error class for HTTP call errors
 */
export class HttpCallError extends Error {
  /**
   * Create an HTTP call error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} request - Request details
   */
  constructor(message, statusCode, request) {
    super(message);
    this.name = 'HttpCallError';
    this.statusCode = statusCode;
    this.request = request;
    Error.captureStackTrace?.(this, HttpCallError);
  }
}

/**
 * HTTP Call Node
 * 
 * Executes HTTP requests with retry logic and comprehensive configuration
 */
export class HttpCallNode {
  /**
   * Create an HTTP call node
   * @param {Object} config - Node configuration
   * @param {string} config.url - Request URL
   * @param {string} config.method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param {Object} config.headers - Request headers
   * @param {any} config.body - Request body
   * @param {Object} config.queryParams - URL query parameters
   * @param {number} config.timeout - Request timeout in milliseconds
   * @param {string} config.responseType - Response type (json, text, blob)
   * @param {Object} config.retryPolicy - Retry configuration
   * @param {number} config.retryPolicy.maxAttempts - Maximum retry attempts
   * @param {number} config.retryPolicy.initialDelay - Initial delay in ms
   * @param {number} config.retryPolicy.backoffMultiplier - Backoff multiplier
   * @param {number} config.retryPolicy.maxDelay - Maximum delay in ms
   * @param {Array<number>} config.retryPolicy.retryableStatusCodes - Status codes to retry
   */
  constructor(config) {
    if (!config.url) {
      throw new HttpCallError('url is required', 0, {});
    }

    this.url = config.url;
    this.method = config.method || 'GET';
    this.headers = config.headers || {};
    this.body = config.body;
    this.queryParams = config.queryParams;
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.responseType = config.responseType || 'json';

    // Retry policy configuration
    this.retryPolicy = {
      maxAttempts: config.retryPolicy?.maxAttempts ?? 3,
      initialDelay: config.retryPolicy?.initialDelay ?? 1000,
      backoffMultiplier: config.retryPolicy?.backoffMultiplier ?? 2,
      maxDelay: config.retryPolicy?.maxDelay ?? 30000,
      retryableStatusCodes: config.retryPolicy?.retryableStatusCodes ?? [
        408, 429, 500, 502, 503, 504,
      ],
    };
  }

  /**
   * Execute the HTTP request
   *
   * @param {any} input - Optional input data from previous node to use as request body
   * @returns {Promise<Object>} Response object with status, data, and headers
   * @throws {HttpCallError} If request fails after all retries
   *
   * @example Without input (uses configured body)
   * const result = await node.execute();
   * console.log(result.status, result.data);
   *
   * @example With input from previous node
   * const result = await node.execute({ userId: 123, action: 'update' });
   * console.log(result.status, result.data);
   */
  async execute(input) {
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
        if (error instanceof HttpCallError) {
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
   * Make the actual HTTP request
   * @private
   * @param {any} input - Optional input data from previous node
   */
  async _makeRequest(input) {
    // Build URL with query parameters and template substitution
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
        throw new HttpCallError(
          `Request timed out after ${this.timeout}ms`,
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
   * Build URL with query parameters and template substitution
   * @private
   * @param {any} input - Optional input data for template substitution
   */
  _buildUrl(input) {
    // Process URL template if input is provided
    let processedUrl = input ? this._processTemplate(this.url, input) : this.url;
    
    if (!this.queryParams || Object.keys(this.queryParams).length === 0) {
      return processedUrl;
    }

    const url = new URL(processedUrl);
    
    // Process query parameters with template substitution
    const processedParams = input
      ? this._processObjectTemplates(this.queryParams, input)
      : this.queryParams;
    
    Object.entries(processedParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    
    return url.toString();
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

    // Determine which body to use and process templates
    let bodyToUse;
    
    if (this.body && input) {
      // If we have both configured body and input, process body templates with input data
      bodyToUse = this._processObjectTemplates(this.body, input);
    } else if (input !== undefined && input !== null) {
      // Use input as body if no configured body
      bodyToUse = input;
    } else {
      // Use configured body
      bodyToUse = this.body;
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
   * Handle HTTP response
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
      throw new HttpCallError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        {
          url: this.url,
          method: this.method,
          body: errorBody,
        }
      );
    }

    // Parse response based on type
    try {
      // Get the actual content-type from the response
      const contentType = response.headers.get('content-type') || '';
      
      // Check if response is XML-based (text/xml, application/xml, application/rss+xml, etc.)
      const isXmlContent = contentType.includes('xml');
      
      if (this.responseType === 'json' && !isXmlContent) {
        result.data = await response.json();
      } else if (this.responseType === 'text' || isXmlContent) {
        // Return text for explicit text type or any XML content
        result.data = await response.text();
      } else if (this.responseType === 'blob') {
        result.data = await response.blob();
      } else {
        // Auto-detect based on content-type
        if (contentType.includes('application/json')) {
          result.data = await response.json();
        } else {
          result.data = await response.text();
        }
      }
    } catch (error) {
      throw new HttpCallError(
        `Failed to parse response: ${error.message}`,
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
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(this.method.toUpperCase())) {
      errors.push(`Invalid HTTP method: ${this.method}`);
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
   * Get request configuration
   * 
   * @returns {Object} Request configuration
   */
  getRequestConfig() {
    return {
      url: this.url,
      method: this.method,
      headers: this.headers,
      body: this.body,
      queryParams: this.queryParams,
      timeout: this.timeout,
      responseType: this.responseType,
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
      type: 'http_call',
      url: this.url,
      method: this.method,
      timeout: this.timeout,
      retryPolicy: this.retryPolicy,
    };
  }
}

/**
 * Create an HTTP call node
 * 
 * @param {Object} config - Node configuration
 * @returns {HttpCallNode} New HTTP call node instance
 */
export function createHttpCallNode(config) {
  return new HttpCallNode(config);
}

/**
 * Common HTTP methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
};

/**
 * Common response types
 */
export const RESPONSE_TYPES = {
  JSON: 'json',
  TEXT: 'text',
  BLOB: 'blob',
};

/**
 * Default retry policy
 */
export const DEFAULT_RETRY_POLICY = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};