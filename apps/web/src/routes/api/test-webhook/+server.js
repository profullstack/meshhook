import { json } from '@sveltejs/kit';
import { WebhookNode } from '$lib/../../src/nodes/webhook.js';

/**
 * Test webhook execution endpoint
 * 
 * Executes a webhook node with the provided configuration and input data,
 * processing template variables in the URL, headers, and body.
 */
export async function POST({ request }) {
	try {
		const { config, input } = await request.json();

		// Validate config
		if (!config || typeof config !== 'object') {
			return json({
				success: false,
				error: 'Invalid config: must be an object'
			}, { status: 400 });
		}

		// Create webhook node
		const webhookNode = new WebhookNode(config);

		// Execute webhook with input data
		const response = await webhookNode.execute(input);

		return json({
			success: true,
			response,
			request: {
				url: config.url,
				method: config.method,
				headers: config.headers,
				bodyTemplate: config.bodyTemplate
			}
		});
	} catch (error) {
		console.error('Webhook test error:', error);
		return json({
			success: false,
			error: {
				message: error.message || 'Unknown error',
				name: error.name,
				statusCode: error.statusCode
			},
			request: null
		}, { status: 500 });
	}
}