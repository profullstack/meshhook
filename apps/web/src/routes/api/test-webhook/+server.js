import { json } from '@sveltejs/kit';
import { WebhookNode } from '$lib/nodes/webhook.js';

/**
 * Test webhook execution endpoint
 * 
 * Executes a webhook node with the provided configuration and input data,
 * processing template variables in the URL, headers, and body.
 */
export async function POST({ request }) {
	try {
		const { config, input } = await request.json();

		console.log('=== test-webhook API called ===');
		console.log('Config:', config);
		console.log('Input:', input);

		// Validate config
		if (!config || typeof config !== 'object') {
			return json({
				success: false,
				error: 'Invalid config: must be an object'
			}, { status: 400 });
		}

		// Validate required fields
		if (!config.url) {
			return json({
				success: false,
				error: 'URL is required in webhook config'
			}, { status: 400 });
		}

		// Parse headers if provided as string
		let headers = config.headers || {};
		if (typeof headers === 'string') {
			try {
				headers = JSON.parse(headers);
			} catch (e) {
				console.error('Failed to parse headers:', e);
				headers = {};
			}
		}

		// Parse bodyTemplate if provided as string
		let bodyTemplate = config.bodyTemplate;
		if (typeof bodyTemplate === 'string') {
			try {
				bodyTemplate = JSON.parse(bodyTemplate);
			} catch (e) {
				console.error('Failed to parse bodyTemplate:', e);
				// Keep as string if not valid JSON
			}
		}

		// Create webhook config with parsed values
		const webhookConfig = {
			...config,
			headers,
			bodyTemplate
		};

		console.log('Parsed webhook config:', webhookConfig);

		// Create webhook node
		const webhookNode = new WebhookNode(webhookConfig);

		// Execute webhook with input data (this will process templates internally)
		const response = await webhookNode.execute(input);

		// Build curl equivalent for debugging (after execution so we can see what was sent)
		const curlHeaders = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
		// Manually process templates for curl display
		const processTemplate = (template, data) => {
			if (!template || typeof template !== 'string') return template;
			return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
				const parts = path.trim().split('.');
				let value = data;
				for (const part of parts) {
					if (value === null || value === undefined) return match;
					value = value[part];
				}
				return value !== undefined ? String(value) : match;
			});
		};
		
		const processObject = (obj, data) => {
			if (obj === null || obj === undefined) return obj;
			if (typeof obj === 'string') return processTemplate(obj, data);
			if (Array.isArray(obj)) return obj.map(item => processObject(item, data));
			if (typeof obj === 'object') {
				const processed = {};
				for (const [key, value] of Object.entries(obj)) {
					processed[key] = processObject(value, data);
				}
				return processed;
			}
			return obj;
		};
		
		const processedBody = processObject(bodyTemplate, input);
		const curlBody = JSON.stringify(processedBody);
		const curlCommand = `curl -X ${config.method} ${curlHeaders} -d '${curlBody}' '${config.url}'`;
		console.log('Equivalent curl command:');
		console.log(curlCommand);

		console.log('Webhook executed successfully');
		console.log('Response:', response);

		return json({
			success: true,
			response,
			request: {
				url: config.url,
				method: config.method,
				headers,
				bodyTemplate
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
			request: error.request || null
		}, { status: 200 }); // Return 200 so client can display error
	}
}