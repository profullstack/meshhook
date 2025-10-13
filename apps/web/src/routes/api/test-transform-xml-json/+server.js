import { json } from '@sveltejs/kit';
import { XmlJsonTransformNode } from '$lib/nodes/transform-xml-json.js';

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

		// Ensure format is set to pretty for XML output
		const nodeConfig = {
			...config,
			format: 'pretty'
		};

		// Create transform node with config
		const node = new XmlJsonTransformNode(nodeConfig);

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