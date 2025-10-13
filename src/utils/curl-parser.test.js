/**
 * cURL Parser Tests
 * 
 * Tests for parsing cURL commands into HTTP request configuration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCurl } from './curl-parser.js';

describe('parseCurl', () => {
	describe('basic parsing', () => {
		it('should parse simple GET request', () => {
			const curl = "curl 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users');
			assert.equal(result.method, 'GET');
			assert.deepEqual(result.headers, {});
			assert.equal(result.body, '');
		});

		it('should parse URL without quotes', () => {
			const curl = 'curl https://api.example.com/users';
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users');
		});

		it('should parse URL with double quotes', () => {
			const curl = 'curl "https://api.example.com/users"';
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users');
		});
	});

	describe('HTTP methods', () => {
		it('should parse POST request with -X flag', () => {
			const curl = "curl -X POST 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.method, 'POST');
		});

		it('should parse POST request with --request flag', () => {
			const curl = "curl --request POST 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.method, 'POST');
		});

		it('should parse PUT request', () => {
			const curl = "curl -X PUT 'https://api.example.com/users/1'";
			const result = parseCurl(curl);
			
			assert.equal(result.method, 'PUT');
		});

		it('should parse DELETE request', () => {
			const curl = "curl -X DELETE 'https://api.example.com/users/1'";
			const result = parseCurl(curl);
			
			assert.equal(result.method, 'DELETE');
		});

		it('should parse PATCH request', () => {
			const curl = "curl -X PATCH 'https://api.example.com/users/1'";
			const result = parseCurl(curl);
			
			assert.equal(result.method, 'PATCH');
		});
	});

	describe('headers', () => {
		it('should parse single header with -H flag', () => {
			const curl = "curl -H 'Content-Type: application/json' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.deepEqual(result.headers, {
				'Content-Type': 'application/json'
			});
		});

		it('should parse single header with --header flag', () => {
			const curl = "curl --header 'Content-Type: application/json' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.deepEqual(result.headers, {
				'Content-Type': 'application/json'
			});
		});

		it('should parse multiple headers', () => {
			const curl = "curl -H 'Content-Type: application/json' -H 'Authorization: Bearer token123' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.deepEqual(result.headers, {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer token123'
			});
		});

		it('should parse headers with double quotes', () => {
			const curl = 'curl -H "Content-Type: application/json" "https://api.example.com/users"';
			const result = parseCurl(curl);
			
			assert.deepEqual(result.headers, {
				'Content-Type': 'application/json'
			});
		});

		it('should handle headers with colons in value', () => {
			const curl = "curl -H 'Authorization: Bearer eyJhbGc:iOiJIUzI1NiIsInR5cCI6IkpXVCJ9' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.deepEqual(result.headers, {
				'Authorization': 'Bearer eyJhbGc:iOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
			});
		});
	});

	describe('request body', () => {
		it('should parse JSON body with -d flag', () => {
			const curl = "curl -X POST -d '{\"name\":\"John\",\"email\":\"john@example.com\"}' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.body, '{"name":"John","email":"john@example.com"}');
		});

		it('should parse body with --data flag', () => {
			const curl = "curl -X POST --data '{\"name\":\"John\"}' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.body, '{"name":"John"}');
		});

		it('should parse body with --data-raw flag', () => {
			const curl = "curl -X POST --data-raw '{\"name\":\"John\"}' 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.body, '{"name":"John"}');
		});

		it('should parse body with double quotes', () => {
			const curl = 'curl -X POST -d "{\\"name\\":\\"John\\"}" "https://api.example.com/users"';
			const result = parseCurl(curl);
			
			assert.equal(result.body, '{"name":"John"}');
		});

		it('should parse multiline body', () => {
			const curl = `curl -X POST -d '{
				"name": "John",
				"email": "john@example.com"
			}' 'https://api.example.com/users'`;
			const result = parseCurl(curl);
			
			assert.ok(result.body.includes('name'));
			assert.ok(result.body.includes('John'));
		});
	});

	describe('complex examples', () => {
		it('should parse complete POST request with headers and body', () => {
			const curl = "curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -H 'Authorization: Bearer token123' -d '{\"name\":\"John\",\"email\":\"john@example.com\"}'";
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users');
			assert.equal(result.method, 'POST');
			assert.deepEqual(result.headers, {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer token123'
			});
			assert.equal(result.body, '{"name":"John","email":"john@example.com"}');
		});

		it('should parse request with query parameters', () => {
			const curl = "curl 'https://api.example.com/users?page=1&limit=10'";
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users?page=1&limit=10');
		});

		it('should handle escaped quotes in body', () => {
			const curl = 'curl -X POST -d "{\\"message\\":\\"Hello \\\\"World\\\\"\\"}" "https://api.example.com/messages"';
			const result = parseCurl(curl);
			
			assert.ok(result.body.includes('message'));
		});
	});

	describe('edge cases', () => {
		it('should throw error for invalid cURL command', () => {
			assert.throws(() => {
				parseCurl('not a curl command');
			}, {
				message: /Invalid cURL command/
			});
		});

		it('should throw error for empty string', () => {
			assert.throws(() => {
				parseCurl('');
			}, {
				message: /Invalid cURL command/
			});
		});

		it('should throw error for curl without URL', () => {
			assert.throws(() => {
				parseCurl('curl -X POST');
			}, {
				message: /URL not found/
			});
		});

		it('should handle curl with backslash line continuations', () => {
			const curl = `curl -X POST \\
				'https://api.example.com/users' \\
				-H 'Content-Type: application/json' \\
				-d '{"name":"John"}'`;
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users');
			assert.equal(result.method, 'POST');
		});

		it('should ignore common curl flags that are not relevant', () => {
			const curl = "curl -v -s -L --compressed 'https://api.example.com/users'";
			const result = parseCurl(curl);
			
			assert.equal(result.url, 'https://api.example.com/users');
			assert.equal(result.method, 'GET');
		});
	});
});