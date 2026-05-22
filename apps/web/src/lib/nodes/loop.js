import jmespath from 'jmespath';

/**
 * Loop Node Implementation
 *
 * Extracts an array from input data using JMESPath expressions.
 * The extracted array is then passed to subsequent nodes, where each
 * item in the array will be processed individually by the workflow engine.
 *
 * @example Basic array extraction
 * const node = new LoopNode({ items: 'data.items[*]' });
 * const result = node.execute({
 *   data: {
 *     items: [{ id: 1 }, { id: 2 }, { id: 3 }]
 *   }
 * });
 * // Result: [{ id: 1 }, { id: 2 }, { id: 3 }]
 *
 * @example Filtering items
 * const node = new LoopNode({ items: 'items[?price > `10`]' });
 * const result = node.execute({
 *   items: [
 *     { name: 'A', price: 5 },
 *     { name: 'B', price: 15 }
 *   ]
 * });
 * // Result: [{ name: 'B', price: 15 }]
 */

/**
 * Custom error class for loop errors
 */
export class LoopError extends Error {
	/**
	 * Create a loop error
	 * @param {string} message - Error message
	 * @param {string} expression - The JMESPath expression that caused the error
	 */
	constructor(message, expression) {
		super(message);
		this.name = 'LoopError';
		this.expression = expression;
		Error.captureStackTrace?.(this, LoopError);
	}
}

/**
 * Loop Node
 *
 * Extracts an array from input data using JMESPath expressions
 */
export class LoopNode {
	/**
	 * Create a loop node
	 * @param {Object} config - Node configuration
	 * @param {string} config.items - JMESPath expression that returns an array
	 * @param {string} config.description - Optional description
	 */
	constructor(config) {
		this.itemsExpression = config.items;
		this.description = config.description;
		this.compiledExpression = null;
		this.compilationError = null;

		// Validate that items expression is provided
		if (!this.itemsExpression || this.itemsExpression.trim() === '') {
			throw new LoopError('items expression is required', '');
		}

		// Pre-compile JMESPath expression
		try {
			this.compiledExpression = jmespath.compile(this.itemsExpression);
		} catch (error) {
			this.compilationError = error;
		}
	}

	/**
	 * Execute the loop node to extract array items
	 *
	 * @param {any} input - Input data to extract items from
	 * @returns {Array} Array of items to loop over
	 * @throws {LoopError} If extraction fails or result is not an array
	 *
	 * @example
	 * const node = new LoopNode({ items: 'users[*]' });
	 * const result = node.execute({
	 *   users: [{ name: 'Alice' }, { name: 'Bob' }]
	 * });
	 * // Result: [{ name: 'Alice' }, { name: 'Bob' }]
	 */
	execute(input) {
		// Check for compilation errors
		if (this.compilationError) {
			throw new LoopError(
				`Invalid JMESPath expression: ${this.compilationError.message}`,
				this.itemsExpression
			);
		}

		try {
			// Execute JMESPath expression
			const result = jmespath.search(input, this.itemsExpression);

			// Validate that result is an array
			if (!Array.isArray(result)) {
				// Provide helpful error message
				const inputType = input === null ? 'null' : Array.isArray(input) ? 'array' : typeof input;
				const resultType = result === null ? 'null' : typeof result;
				throw new LoopError(
					`Loop expression must return an array, got ${resultType}. Input was ${inputType}. Expression: "${this.itemsExpression}"`,
					this.itemsExpression
				);
			}

			return result;
		} catch (error) {
			// Re-throw LoopError as-is
			if (error instanceof LoopError) {
				throw error;
			}

			// Wrap other errors
			throw new LoopError(
				`Loop execution failed: ${error.message}`,
				this.itemsExpression
			);
		}
	}

	/**
	 * Validate the loop configuration
	 *
	 * @returns {Object} Validation result with valid flag and optional errors
	 *
	 * @example
	 * const node = new LoopNode({ items: 'items[*]' });
	 * const result = node.validate();
	 * // Result: { valid: true }
	 */
	validate() {
		const errors = [];

		// Check for compilation errors
		if (this.compilationError) {
			errors.push(this.compilationError.message);
		} else {
			// Try to compile expression
			try {
				jmespath.compile(this.itemsExpression);
			} catch (error) {
				errors.push(error.message);
			}
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	/**
	 * Preview loop execution with sample data
	 *
	 * @param {any} sampleData - Sample data to preview loop
	 * @returns {Array} Preview result
	 * @throws {LoopError} If preview fails
	 *
	 * @example
	 * const node = new LoopNode({ items: 'items[*]' });
	 * const preview = node.preview({
	 *   items: [{ id: 1 }, { id: 2 }]
	 * });
	 * // Result: [{ id: 1 }, { id: 2 }]
	 */
	preview(sampleData) {
		return this.execute(sampleData);
	}

	/**
	 * Get node metadata
	 *
	 * @returns {Object} Node metadata
	 */
	getMetadata() {
		return {
			type: 'loop',
			itemsExpression: this.itemsExpression,
			description: this.description,
			valid: this.validate().valid,
		};
	}
}

/**
 * Create a loop node
 *
 * @param {Object} config - Node configuration
 * @returns {LoopNode} New loop node instance
 */
export function createLoopNode(config) {
	return new LoopNode(config);
}

/**
 * Common JMESPath patterns for loop nodes
 */
export const LOOP_PATTERNS = {
	// Extract all items from array
	ALL_ITEMS: (arrayPath) => `${arrayPath}[*]`,

	// Filter items by condition
	FILTER: (arrayPath, condition) => `${arrayPath}[?${condition}]`,

	// Sort items
	SORT: (arrayPath, property) => `${arrayPath} | sort_by(@, &${property})`,

	// Filter and sort
	FILTER_AND_SORT: (arrayPath, condition, property) =>
		`${arrayPath}[?${condition}] | sort_by(@, &${property})`,

	// Extract specific properties
	PROJECT: (arrayPath, properties) => {
		const projections = properties.map((p) => `${p}: ${p}`).join(', ');
		return `${arrayPath}[*].{${projections}}`;
	},

	// Limit number of items
	LIMIT: (arrayPath, count) => `${arrayPath}[:${count}]`,

	// Skip and limit (pagination)
	PAGINATE: (arrayPath, skip, limit) => `${arrayPath}[${skip}:${skip + limit}]`,
};

/**
 * Validate JMESPath expression for loop node
 *
 * @param {string} expression - JMESPath expression to validate
 * @returns {Object} Validation result
 */
export function validateLoopExpression(expression) {
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