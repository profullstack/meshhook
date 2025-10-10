/**
 * Template processor for webhook body templates
 * Supports {{ variable }} syntax for field mapping
 * Uses JMESPath for complex expressions
 */

import jmespath from 'jmespath';

/**
 * Process a template string with data using {{ }} syntax
 * @param {string} template - Template string with {{ }} placeholders
 * @param {object} data - Data object to extract values from
 * @returns {string} Processed template with values replaced
 */
export function processTemplate(template, data) {
	if (!template || typeof template !== 'string') {
		return template;
	}

	// Match {{ expression }} patterns
	const regex = /\{\{([^}]+)\}\}/g;
	
	return template.replace(regex, (match, expression) => {
		const trimmedExpr = expression.trim();
		
		try {
			// Use JMESPath to evaluate the expression
			const result = jmespath.search(data, trimmedExpr);
			
			// Handle different result types
			if (result === null || result === undefined) {
				return '';
			}
			
			if (typeof result === 'object') {
				return JSON.stringify(result);
			}
			
			return String(result);
		} catch (error) {
			console.error(`Template processing error for expression "${trimmedExpr}":`, error);
			return match; // Return original placeholder on error
		}
	});
}

/**
 * Process a template object (like headers or body JSON)
 * @param {object|string} template - Template object or string
 * @param {object} data - Data object to extract values from
 * @returns {object|string} Processed template with values replaced
 */
export function processTemplateObject(template, data) {
	if (typeof template === 'string') {
		try {
			// Try to parse as JSON first
			const parsed = JSON.parse(template);
			return processTemplateObject(parsed, data);
		} catch {
			// If not JSON, process as string template
			return processTemplate(template, data);
		}
	}
	
	if (Array.isArray(template)) {
		return template.map(item => processTemplateObject(item, data));
	}
	
	if (template && typeof template === 'object') {
		const result = {};
		for (const [key, value] of Object.entries(template)) {
			const processedKey = processTemplate(key, data);
			result[processedKey] = processTemplateObject(value, data);
		}
		return result;
	}
	
	return template;
}

/**
 * Validate a template string for syntax errors
 * @param {string} template - Template string to validate
 * @returns {object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateTemplate(template) {
	const errors = [];
	
	if (!template || typeof template !== 'string') {
		return { valid: true, errors: [] };
	}
	
	// Check for unmatched braces
	const openBraces = (template.match(/\{\{/g) || []).length;
	const closeBraces = (template.match(/\}\}/g) || []).length;
	
	if (openBraces !== closeBraces) {
		errors.push('Unmatched template braces {{ }}');
	}
	
	// Extract all expressions and validate them
	const regex = /\{\{([^}]+)\}\}/g;
	let match;
	
	while ((match = regex.exec(template)) !== null) {
		const expression = match[1].trim();
		
		if (!expression) {
			errors.push('Empty template expression found');
			continue;
		}
		
		// Basic JMESPath syntax validation
		// We'll validate by attempting to search with empty data
		try {
			jmespath.search({}, expression);
		} catch (error) {
			errors.push(`Invalid JMESPath expression "${expression}": ${error.message}`);
		}
	}
	
	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Extract all template variables from a template string
 * @param {string} template - Template string
 * @returns {string[]} Array of variable expressions found
 */
export function extractTemplateVariables(template) {
	if (!template || typeof template !== 'string') {
		return [];
	}
	
	const variables = [];
	const regex = /\{\{([^}]+)\}\}/g;
	let match;
	
	while ((match = regex.exec(template)) !== null) {
		variables.push(match[1].trim());
	}
	
	return variables;
}