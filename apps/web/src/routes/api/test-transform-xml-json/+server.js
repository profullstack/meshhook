import { json } from '@sveltejs/kit';
import { XmlJsonTransformNode } from '../../../../../src/nodes/transform-xml-json.js';

/**
 * Test XML/JSON transformation endpoint
 * 
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request }) {
	try {
		const { input, config } = await request.json();

		if (!input) {
			return json(
				{ error: true, message: 'Input is required' },
				{ status: 400 }
			);
		}

		// Create transform node with config
		const node = new XmlJsonTransformNode(config || {});

		// Perform transformation
		const output = node.transform(input);

		return json({
			success: true,
			output
		});
	} catch (error) {
		console.error('Transform test error:', error);
		return json(
			{
				error: true,
				message: error.message || 'Transform failed'
			},
			{ status: 500 }
		);
	}
}