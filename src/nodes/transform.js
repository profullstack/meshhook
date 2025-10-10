import jmespath from 'jmespath';

/**
 * Transform Node Implementation
 * 
 * Implements data transformation using JMESPath expressions.
 * JMESPath is a query language for JSON that allows you to extract
 * and transform data from JSON documents.
 * 
 * @example
 * const node = new TransformNode({
 *   expression: 'users[*].{name: name, email: email}'
 * });
 * 
 * const result = node.transform({
 *   users: [
 *     { name: 'Alice', email: 'alice@example.com', age: 30 },
 *     { name: 'Bob', email: 'bob@example.com', age: 25 }
 *   ]
 * });
 * // Result: [
 * //   { name: 'Alice', email: 'alice@example.com' },
 * //   { name: 'Bob', email: 'bob@example.com' }
 * // ]
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
 * Transforms input data using JMESPath expressions
 */
export class TransformNode {
  /**
   * Create a transform node
   * @param {Object} config - Node configuration
   * @param {string} config.expression - JMESPath expression
   * @param {Object} config.options - Optional JMESPath options
   */
  constructor(config) {
    if (!config.expression) {
      throw new TransformError('expression is required', '');
    }

    this.expression = config.expression;
    this.options = config.options || {};
    this.compiledExpression = null;

    // Pre-compile the expression for better performance
    try {
      this.compiledExpression = jmespath.compile(this.expression);
    } catch (error) {
      // Expression will be validated later, store error for validation
      this.compilationError = error;
    }
  }

  /**
   * Transform input data using the JMESPath expression
   * 
   * @param {any} input - Input data to transform
   * @returns {any} Transformed data
   * @throws {TransformError} If transformation fails
   * 
   * @example
   * const node = new TransformNode({ expression: 'data.value' });
   * const result = node.transform({ data: { value: 42 } });
   * // Result: 42
   */
  transform(input) {
    try {
      // Use jmespath.search directly - compilation is for validation only
      return jmespath.search(input, this.expression);
    } catch (error) {
      throw new TransformError(
        `Transform failed: ${error.message}`,
        this.expression
      );
    }
  }

  /**
   * Validate the JMESPath expression
   * 
   * @returns {Object} Validation result with valid flag and optional errors
   * 
   * @example
   * const node = new TransformNode({ expression: 'data.value' });
   * const result = node.validate();
   * // Result: { valid: true }
   */
  validate() {
    if (this.compilationError) {
      return {
        valid: false,
        errors: [this.compilationError.message],
      };
    }

    try {
      // Try to compile the expression
      jmespath.compile(this.expression);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
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
      expression: this.expression,
      valid: !this.compilationError,
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