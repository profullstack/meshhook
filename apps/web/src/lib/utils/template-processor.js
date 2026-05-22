/**
 * Enhanced Template Processor with Array Looping Support
 * 
 * Supports:
 * - Simple variable substitution: {{variable}}
 * - Nested paths: {{object.property}}
 * - Array access: {{array[0]}}
 * - Array looping: {{#each array}}...{{/each}}
 * - Loop item access: {{this}} or {{this.property}}
 * - Loop index: {{@index}}
 */

/**
 * Get value from object by path string
 * @param {Object} obj - Source object
 * @param {string} path - Dot/bracket notation path
 * @returns {*} Value at path or undefined
 */
export function getValueByPath(obj, path) {
	if (!path || path === 'this') return obj;
	
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
 * Process a loop block
 * @param {string} arrayPath - Path to array in data
 * @param {string} loopContent - Content inside loop block
 * @param {Object} data - Source data object
 * @returns {string} Processed loop output
 */
function processLoop(arrayPath, loopContent, data) {
	const array = getValueByPath(data, arrayPath.trim());
	
	if (!Array.isArray(array)) {
		return `<!-- Error: ${arrayPath} is not an array -->`;
	}
	
	if (array.length === 0) {
		return '<!-- Empty array -->';
	}
	
	return array.map((item, index) => {
		// Replace {{this}} with current item
		// Replace {{this.property}} with item property
		// Replace {{@index}} with current index
		return loopContent.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
			const trimmedPath = path.trim();
			
			// Handle special @index variable
			if (trimmedPath === '@index') {
				return String(index);
			}
			
			// Handle @index0 (0-based) and @index1 (1-based)
			if (trimmedPath === '@index0') {
				return String(index);
			}
			if (trimmedPath === '@index1') {
				return String(index + 1);
			}
			
			// Handle 'this' reference
			if (trimmedPath === 'this') {
				if (typeof item === 'object') {
					return JSON.stringify(item, null, 2);
				}
				return String(item);
			}
			
			// Handle 'this.property' reference
			if (trimmedPath.startsWith('this.')) {
				const propPath = trimmedPath.substring(5);
				const value = getValueByPath(item, propPath);
				
				if (value === undefined || value === null) {
					return match;
				}
				
				if (typeof value === 'object') {
					return JSON.stringify(value, null, 2);
				}
				
				return String(value);
			}
			
			// For simple property names without 'this.', try to get from item
			const value = getValueByPath(item, trimmedPath);
			
			if (value === undefined || value === null) {
				return match;
			}
			
			if (typeof value === 'object') {
				return JSON.stringify(value, null, 2);
			}
			
			return String(value);
		});
	}).join('');
}

/**
 * Process template with variable substitution and loop support
 * @param {string} templateStr - Template string
 * @param {Object} data - Data object for substitution
 * @returns {string} Processed template
 */
export function processTemplate(templateStr, data) {
	if (!templateStr) return '';
	
	try {
		// First, process all loops
		let result = templateStr.replace(
			/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
			(match, arrayPath, loopContent) => {
				return processLoop(arrayPath, loopContent, data);
			}
		);
		
		// Then process remaining simple variables
		result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
			const trimmedPath = path.trim();
			
			// Skip loop directives that might remain
			if (trimmedPath.startsWith('#') || trimmedPath.startsWith('/')) {
				return match;
			}
			
			const value = getValueByPath(data, trimmedPath);
			
			if (value === undefined || value === null) {
				return match; // Keep original if not found
			}
			
			if (typeof value === 'object') {
				return JSON.stringify(value, null, 2);
			}
			
			return String(value);
		});
		
		return result;
	} catch (error) {
		return `Error: ${error.message}`;
	}
}

/**
 * Validate template syntax
 * @param {string} templateStr - Template to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateTemplate(templateStr) {
	const errors = [];
	
	if (!templateStr) {
		return { valid: true, errors: [] };
	}
	
	// Check for balanced loop tags
	const eachMatches = (templateStr.match(/\{\{#each/g) || []).length;
	const endEachMatches = (templateStr.match(/\{\{\/each\}\}/g) || []).length;
	
	if (eachMatches !== endEachMatches) {
		errors.push(`Unbalanced loop tags: ${eachMatches} {{#each}} but ${endEachMatches} {{/each}}`);
	}
	
	// Check for nested loops (currently not supported)
	const loopRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
	let match;
	while ((match = loopRegex.exec(templateStr)) !== null) {
		const loopContent = match[2];
		if (loopContent.includes('{{#each')) {
			errors.push('Nested loops are not currently supported');
			break;
		}
	}
	
	return {
		valid: errors.length === 0,
		errors
	};
}