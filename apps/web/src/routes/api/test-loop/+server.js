import { json } from '@sveltejs/kit';
import { LoopNode } from '$lib/nodes/loop.js';

/**
 * Test Loop Node Endpoint
 * 
 * Tests a loop node configuration by executing the JMESPath expression
 * and returning the extracted array.
 */
export async function POST({ request }) {
	try {
		const { config, input } = await request.json();
		
		// Log the request for debugging
		console.log('=== Loop Test API Request ===');
		console.log('Config:', JSON.stringify(config, null, 2));
		console.log('Input type:', Array.isArray(input) ? 'array' : typeof input);
		console.log('Input:', JSON.stringify(input, null, 2));
		console.log('===========================');

		// Validate config
		if (!config || !config.items) {
			console.error('Invalid config - missing items expression');
			return json({
				success: false,
				error: {
					message: 'Loop configuration is required with items expression',
					code: 'INVALID_CONFIG'
				}
			}, { status: 400 });
		}

		// Create loop node
		const loopNode = new LoopNode(config);

		// Validate the expression
		const validation = loopNode.validate();
		if (!validation.valid) {
			console.error('Invalid expression:', validation.errors);
			return json({
				success: false,
				error: {
					message: `Invalid JMESPath expression: ${validation.errors.join(', ')}`,
					code: 'INVALID_EXPRESSION'
				}
			}, { status: 400 });
		}

		// Execute the loop node
		console.log('Executing loop node with expression:', config.items);
		const result = loopNode.execute(input);
		console.log('Loop result - array length:', result.length);

		return json({
			success: true,
			output: result,
			count: result.length,
			preview: result.slice(0, 5) // First 5 items for preview
		});
	} catch (error) {
		console.error('=== Loop Test Error ===');
		console.error('Error:', error);
		console.error('Message:', error.message);
		console.error('Expression:', error.expression);
		console.error('======================');

		return json({
			success: false,
			error: {
				message: error.message || 'Failed to test loop node',
				code: error.name || 'LOOP_ERROR',
				expression: error.expression
			}
		}, { status: 500 });
	}
}