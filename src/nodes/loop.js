import jmespath from 'jmespath';

/**
 * Loop Node Implementation
 *
 * Supports two modes:
 * 1. Simple Loop (legacy): Extracts an array from input data using JMESPath
 * 2. Container Loop (new): Acts as a container that executes child nodes for each array item
 *
 * @example Basic array extraction (legacy mode)
 * const node = new LoopNode({ items: 'data.items[*]' });
 * const result = node.execute({
 *   data: {
 *     items: [{ id: 1 }, { id: 2 }, { id: 3 }]
 *   }
 * });
 * // Result: [{ id: 1 }, { id: 2 }, { id: 3 }]
 *
 * @example Container loop with child nodes (new mode)
 * const node = new LoopNode({
 *   items: 'data.items[*]',
 *   isContainer: true,
 *   childNodes: ['transform-1', 'http-1']
 * });
 * const result = await node.executeContainer(input, childNodesArray, executeChildNode);
 * // Result: [result1, result2, result3] - one result per array item
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
	 * @param {boolean} config.isContainer - Whether this is a container loop
	 * @param {Array<string>} config.childNodes - IDs of child nodes (for container mode)
	 */
	constructor(config) {
		this.itemsExpression = config.items;
		this.description = config.description;
		this.isContainer = config.isContainer || false;
		this.childNodes = config.childNodes || [];
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
	 * Extract array from input using JMESPath expression
	 * This is used during testing and initial workflow execution
	 *
	 * @param {any} input - Input data to extract items from
	 * @returns {Array} Array of items to loop over
	 * @throws {LoopError} If extraction fails or result is not an array
	 *
	 * @example
	 * const node = new LoopNode({ items: 'users[*]' });
	 * const result = node.extractArray({
	 *   users: [{ name: 'Alice' }, { name: 'Bob' }]
	 * });
	 * // Result: [{ name: 'Alice' }, { name: 'Bob' }]
	 */
	extractArray(input) {
		// Check for compilation errors
		if (this.compilationError) {
			throw new LoopError(
				`Invalid JMESPath expression: ${this.compilationError.message}`,
				this.itemsExpression
			);
		}

		try {
			// Execute JMESPath expression to extract array from input
			const result = jmespath.search(input, this.itemsExpression);

			// Validate that result is an array
			if (!Array.isArray(result)) {
				throw new LoopError(
					`Loop expression must return an array, got ${result === null ? 'null' : typeof result}`,
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
				`Loop extraction failed: ${error.message}`,
				this.itemsExpression
			);
		}
	}

	/**
	 * Execute the loop node (for backward compatibility and workflow execution)
	 * Delegates to extractArray
	 *
	 * @param {any} input - Input data to extract items from
	 * @returns {Array} Array of items to loop over
	 * @throws {LoopError} If extraction fails or result is not an array
	 */
	execute(input) {
		return this.extractArray(input);
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
	 * Execute container loop - iterates over array and executes child nodes for each item
	 *
	 * @param {any} input - Input data to extract array from
	 * @param {Array} childNodes - Array of child node objects
	 * @param {Function} executeChildNode - Function to execute a child node: (node, input) => Promise<output>
	 * @returns {Promise<Array>} Array of results from executing child nodes for each item
	 * @throws {LoopError} If execution fails
	 *
	 * @example
	 * const results = await loopNode.executeContainer(
	 *   { data: { items: [1, 2, 3] } },
	 *   [transformNode, httpNode],
	 *   async (node, input) => await node.execute(input)
	 * );
	 */
	async executeContainer(input, childNodes, executeChildNode) {
		// Extract array using JMESPath
		const items = this.extractArray(input);
		
		if (!Array.isArray(items)) {
			throw new LoopError(
				'Container loop requires an array',
				this.itemsExpression
			);
		}
		
		// Execute child nodes for each item
		const results = [];
		
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			let currentInput = item;
			
			// Execute each child node in sequence
			for (const childNode of childNodes) {
				try {
					currentInput = await executeChildNode(childNode, currentInput);
				} catch (error) {
					throw new LoopError(
						`Failed to execute child node in loop iteration ${i}: ${error.message}`,
						this.itemsExpression
					);
				}
			}
			
			// Store the final output from the last child node
			results.push(currentInput);
		}
		
		return results;
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
			isContainer: this.isContainer,
			childNodes: this.childNodes,
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