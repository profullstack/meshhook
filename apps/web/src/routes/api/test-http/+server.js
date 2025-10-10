import { json, error } from '@sveltejs/kit';
import { HttpCallNode } from '$lib/../../src/nodes/http-call.js';

/**
 * API endpoint for testing HTTP calls
 * 
 * This endpoint allows testing HTTP call configurations without saving them to a workflow.
 * It uses the HttpCallNode implementation to execute the request and returns detailed
 * response information including headers, timing, and error details.
 */
export async function POST({ request }) {
	try {
		const config = await request.json();

		// Validate required fields
		if (!config.url) {
			throw error(400, 'URL is required');
		}

		// Parse headers if provided as string
		let headers = config.headers || {};
		if (typeof headers === 'string') {
			try {
				headers = JSON.parse(headers);
			} catch (e) {
				throw error(400, 'Invalid headers JSON format');
			}
		}

		// Parse body if provided as string
		let body = config.body;
		if (typeof body === 'string' && body.trim()) {
			try {
				body = JSON.parse(body);
			} catch (e) {
				// If it's not valid JSON, keep it as string
				// The HttpCallNode will handle it appropriately
			}
		}

		// Parse query params if provided as string
		let queryParams = config.queryParams;
		if (typeof queryParams === 'string' && queryParams.trim()) {
			try {
				queryParams = JSON.parse(queryParams);
			} catch (e) {
				throw error(400, 'Invalid query parameters JSON format');
			}
		}

		// Create HTTP call node with configuration
		const httpNode = new HttpCallNode({
			url: config.url,
			method: config.method || 'GET',
			headers,
			body,
			queryParams,
			timeout: config.timeout ? parseInt(config.timeout, 10) : 30000,
			responseType: config.responseType || 'json',
			retryPolicy: {
				maxAttempts: 1, // No retries for test calls
				initialDelay: 1000,
				backoffMultiplier: 2,
				maxDelay: 30000,
				retryableStatusCodes: [408, 429, 500, 502, 503, 504]
			}
		});

		// Validate configuration
		const validation = httpNode.validate();
		if (!validation.valid) {
			throw error(400, validation.errors.join(', '));
		}

		// Execute the request and measure timing
		const startTime = Date.now();
		let response;
		let executionError = null;

		try {
			response = await httpNode.execute();
		} catch (err) {
			executionError = err;
		}

		const duration = Date.now() - startTime;

		// Build request details for response
		// Build URL with query parameters manually
		let finalUrl = httpNode.url;
		if (httpNode.queryParams && Object.keys(httpNode.queryParams).length > 0) {
			const url = new URL(httpNode.url);
			Object.entries(httpNode.queryParams).forEach(([key, value]) => {
				url.searchParams.append(key, String(value));
			});
			finalUrl = url.toString();
		}
		
		const requestDetails = {
			url: finalUrl,
			method: httpNode.method,
			headers: httpNode.headers,
			body: httpNode.body
		};

		// If execution failed, return error details
		if (executionError) {
			return json({
				success: false,
				error: {
					message: executionError.message,
					statusCode: executionError.statusCode || 0,
					name: executionError.name
				},
				request: requestDetails,
				timing: {
					duration
				}
			}, { status: 200 }); // Return 200 so the client can display the error
		}

		// Return successful response with all details
		return json({
			success: true,
			response: {
				status: response.status,
				statusText: response.statusText,
				ok: response.ok,
				headers: response.headers,
				data: response.data,
				timing: {
					duration
				}
			},
			request: requestDetails
		});

	} catch (err) {
		console.error('Error testing HTTP call:', err);
		
		// Handle SvelteKit errors
		if (err?.status) {
			throw err;
		}

		// Return generic error
		throw error(500, err.message || 'Failed to test HTTP call');
	}
}