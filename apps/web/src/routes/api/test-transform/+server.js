import { json, error } from '@sveltejs/kit';
import { TransformNode } from '$lib/nodes/transform.js';

/**
 * API endpoint for testing transform operations
 * 
 * This endpoint allows testing transform configurations without saving them to a workflow.
 * It uses the TransformNode implementation to execute the transformation and returns
 * the transformed output or error details.
 */
export async function POST({ request }) {
	try {
		const { config, input } = await request.json();

		// Validate required fields
		if (!config) {
			throw error(400, 'Configuration is required');
		}

		if (!config.expression && !config.template) {
			throw error(400, 'Either expression or template is required');
		}

		// Create transform node with configuration
		const transformNode = new TransformNode({
			expression: config.expression,
			template: config.template
		});

		// Validate configuration
		const validation = transformNode.validate();
		if (!validation.valid) {
			throw error(400, validation.errors.join(', '));
		}

		// Execute the transformation and measure timing
		const startTime = Date.now();
		let output;
		let executionError = null;

		try {
			output = transformNode.transform(input || {});
		} catch (err) {
			executionError = err;
		}

		const duration = Date.now() - startTime;

		// If execution failed, return error details
		if (executionError) {
			return json({
				success: false,
				error: executionError.message || 'Transform failed',
				timing: {
					duration
				}
			}, { status: 200 }); // Return 200 so the client can display the error
		}

		// Return successful response with transformed output
		return json({
			success: true,
			output,
			timing: {
				duration
			}
		});

	} catch (err) {
		console.error('Error testing transform:', err);
		
		// Handle SvelteKit errors
		if (err?.status) {
			throw err;
		}

		// Return generic error
		throw error(500, err.message || 'Failed to test transform');
	}
}