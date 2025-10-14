import { json } from '@sveltejs/kit';
import { LoopNode } from '../../../../../src/nodes/loop.js';

/**
 * Test Loop Node Endpoint
 * 
 * Tests a loop node configuration by executing the JMESPath expression
 * and returning the extracted array.
 */
export async function POST({ request }) {
	try {
		const { config, input } = await request.json();

		// Validate config
		if (!config || !config.items) {
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
			return json({
				success: false,
				error: {
					message: `Invalid JMESPath expression: ${validation.errors.join(', ')}`,
					code: 'INVALID_EXPRESSION'
				}
			}, { status: 400 });
		}

		// Execute the loop node
		const result = loopNode.execute(input);

		return json({
			success: true,
			output: result,
			count: result.length,
			preview: result.slice(0, 5) // First 5 items for preview
		});
	} catch (error) {
		console.error('Loop test error:', error);

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