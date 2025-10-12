import jmespath from 'jmespath';

/**
 * Transform Node Implementation
 *
 * Implements data transformation using either:
 * 1. JMESPath expressions for complex queries
 * 2. Template-based transformations with variable substitution
 *
 * @example JMESPath
 * const node = new TransformNode({
 *   expression: 'users[*].{name: name, email: email}'
 * });
 *
 * @example Template
 * const node = new TransformNode({
 *   template: 'Hello {{name}}! Your order #{{order.id}} is {{status}}.'
 * });
 *
 * const result = node.transform({
 *   name: 'Alice',
 *   order: { id: 123 },
 *   status: 'shipped'
 * });
 * // Result: "Hello Alice! Your order #123 is shipped."
 */

/**
 * Custom error class for transform errors
 */
export class TransformError extends Error {
  /**
   * Create a transform error
   * @param {string} message - Error message
   * @param {string} expression - The JMESPath expression that caused the error
   */
  constructor(message, expression) {
    super(message);
    this.name = 'TransformError';
    this.expression = expression;
    Error.captureStackTrace?.(this, TransformError);
  }
}

/**
 * Transform Node
 *
 * Transforms input data using JMESPath expressions or templates
 */
export class TransformNode {
  /**
   * Create a transform node
   * @param {Object} config - Node configuration
   * @param {string} config.expression - JMESPath expression (legacy)
   * @param {string} config.template - Template string with {{variable}} syntax
   * @param {Object} config.options - Optional JMESPath options
   */
  constructor(config) {
    // Support both template and expression modes
    this.template = config.template;
    this.expression = config.expression;
    this.options = config.options || {};
    this.compiledExpression = null;
    this.compilationError = null;

    // Validate that at least one mode is provided
    if (!this.template && !this.expression) {
      throw new TransformError('Either template or expression is required', '');
    }

    // Pre-compile JMESPath expression if provided
    if (this.expression) {
      try {
        this.compiledExpression = jmespath.compile(this.expression);
      } catch (error) {
        this.compilationError = error;
      }
    }
  }

  /**
   * Transform input data using template or JMESPath expression
   *
   * @param {any} input - Input data to transform
   * @returns {any} Transformed data
   * @throws {TransformError} If transformation fails
   *
   * @example Template
   * const node = new TransformNode({ template: 'Hello {{name}}!' });
   * const result = node.transform({ name: 'Alice' });
   * // Result: "Hello Alice!"
   *
   * @example JMESPath
   * const node = new TransformNode({ expression: 'data.value' });
   * const result = node.transform({ data: { value: 42 } });
   * // Result: 42
   */
  transform(input) {
    try {
      // Use template mode if template is provided
      if (this.template) {
        return this._processTemplate(this.template, input);
      }
      
      // Otherwise use JMESPath expression
      return jmespath.search(input, this.expression);
    } catch (error) {
      throw new TransformError(
        `Transform failed: ${error.message}`,
        this.template || this.expression
      );
    }
  }

  /**
   * Process template with variable substitution
   * @private
   * @param {string} template - Template string
   * @param {any} data - Data object for variable substitution
   * @returns {string} Processed template
   */
  _processTemplate(template, data) {
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
   * Validate the transform configuration
   *
   * @returns {Object} Validation result with valid flag and optional errors
   *
   * @example
   * const node = new TransformNode({ template: 'Hello {{name}}!' });
   * const result = node.validate();
   * // Result: { valid: true }
   */
  validate() {
    const errors = [];

    // Validate template if provided
    if (this.template) {
      // Check for balanced braces
      const openBraces = (this.template.match(/\{\{/g) || []).length;
      const closeBraces = (this.template.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push('Template has unbalanced braces');
      }
      
      // Check for empty variable names
      if (/\{\{\s*\}\}/.test(this.template)) {
        errors.push('Template contains empty variable names');
      }
    }

    // Validate JMESPath expression if provided
    if (this.expression) {
      if (this.compilationError) {
        errors.push(this.compilationError.message);
      } else {
        try {
          jmespath.compile(this.expression);
        } catch (error) {
          errors.push(error.message);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Preview transformation with sample data
   * 
   * @param {any} sampleData - Sample data to preview transformation
   * @returns {any} Preview result
   * @throws {TransformError} If preview fails
   * 
   * @example
   * const node = new TransformNode({ expression: 'users[*].name' });
   * const preview = node.preview({
   *   users: [{ name: 'Alice' }, { name: 'Bob' }]
   * });
   * // Result: ['Alice', 'Bob']
   */
  preview(sampleData) {
    return this.transform(sampleData);
  }

  /**
   * Get node metadata
   *
   * @returns {Object} Node metadata
   */
  getMetadata() {
    return {
      type: 'transform',
      mode: this.template ? 'template' : 'expression',
      template: this.template,
      expression: this.expression,
      valid: this.validate().valid,
    };
  }
}

/**
 * Create a transform node
 * 
 * @param {Object} config - Node configuration
 * @returns {TransformNode} New transform node instance
 */
export function createTransformNode(config) {
  return new TransformNode(config);
}

/**
 * Common JMESPath expression templates
 */
export const JMESPATH_TEMPLATES = {
  // Extract single property
  EXTRACT_PROPERTY: (prop) => prop,
  
  // Extract nested property
  EXTRACT_NESTED: (path) => path,
  
  // Map array elements
  MAP_ARRAY: (arrayPath, property) => `${arrayPath}[*].${property}`,
  
  // Filter array
  FILTER_ARRAY: (arrayPath, condition) => `${arrayPath}[?${condition}]`,
  
  // Create object projection
  PROJECT_OBJECT: (fields) => {
    const projections = Object.entries(fields)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `{ ${projections} }`;
  },
  
  // Aggregate functions
  SUM: (arrayPath) => `sum(${arrayPath})`,
  AVG: (arrayPath) => `avg(${arrayPath})`,
  MAX: (arrayPath) => `max(${arrayPath})`,
  MIN: (arrayPath) => `min(${arrayPath})`,
  LENGTH: (arrayPath) => `length(${arrayPath})`,
};

/**
 * Validate JMESPath expression
 * 
 * @param {string} expression - JMESPath expression to validate
 * @returns {Object} Validation result
 */
export function validateExpression(expression) {
  try {
    jmespath.compile(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}