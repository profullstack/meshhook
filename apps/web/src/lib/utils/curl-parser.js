/**
 * cURL Parser Utility (Browser Version)
 * 
 * Parses cURL commands into HTTP request configuration objects.
 * Supports common cURL flags and formats similar to n8n's implementation.
 */

/**
 * Parse a cURL command string into HTTP request configuration
 * @param {string} curlCommand - The cURL command to parse
 * @returns {Object} Parsed configuration with url, method, headers, and body
 * @throws {Error} If the cURL command is invalid or missing required parts
 */
export function parseCurl(curlCommand) {
	if (!curlCommand || typeof curlCommand !== 'string') {
		throw new Error('Invalid cURL command: command must be a non-empty string');
	}

	// Remove line continuations (backslash followed by newline)
	const cleanCommand = curlCommand.replace(/\\\s*\n\s*/g, ' ').trim();

	// Check if command starts with 'curl'
	if (!cleanCommand.startsWith('curl')) {
		throw new Error('Invalid cURL command: must start with "curl"');
	}

	// Initialize result object
	const result = {
		url: '',
		method: 'GET',
		headers: {},
		body: ''
	};

	// Parse the command
	result.url = extractUrl(cleanCommand);
	result.method = extractMethod(cleanCommand);
	result.headers = extractHeaders(cleanCommand);
	result.body = extractBody(cleanCommand);

	return result;
}

/**
 * Extract URL from cURL command
 * @param {string} command - The cURL command
 * @returns {string} The extracted URL
 * @throws {Error} If URL is not found
 */
function extractUrl(command) {
	// Remove the 'curl' command itself
	let remaining = command.substring(4).trim();

	// Remove known flags and their values to isolate the URL
	// This regex removes common flags: -X, -H, -d, --request, --header, --data, etc.
	const flagsToRemove = [
		/-X\s+\w+/g,
		/--request\s+\w+/g,
		/-H\s+(['"])[^'"]*\1/g,
		/--header\s+(['"])[^'"]*\1/g,
		/-d\s+(['"])[^'"]*\1/g,
		/--data\s+(['"])[^'"]*\1/g,
		/--data-raw\s+(['"])[^'"]*\1/g,
		/-[vslL]/g,
		/--compressed/g,
		/--verbose/g,
		/--silent/g,
		/--location/g
	];

	let cleaned = remaining;
	for (const pattern of flagsToRemove) {
		cleaned = cleaned.replace(pattern, '');
	}

	// Extract URL - it should be quoted or be the remaining non-flag text
	const urlMatch = cleaned.match(/(['"])(https?:\/\/[^'"]+)\1/) || 
	                 cleaned.match(/(https?:\/\/\S+)/);

	if (!urlMatch) {
		throw new Error('URL not found in cURL command');
	}

	return urlMatch[2] || urlMatch[1];
}

/**
 * Extract HTTP method from cURL command
 * @param {string} command - The cURL command
 * @returns {string} The HTTP method (default: GET)
 */
function extractMethod(command) {
	// Look for -X or --request flag
	const methodMatch = command.match(/-X\s+(\w+)/) || 
	                    command.match(/--request\s+(\w+)/);

	if (methodMatch) {
		return methodMatch[1].toUpperCase();
	}

	// If -d or --data is present without explicit method, default to POST
	if (command.match(/-d\s+/) || command.match(/--data/)) {
		return 'POST';
	}

	return 'GET';
}

/**
 * Extract headers from cURL command
 * @param {string} command - The cURL command
 * @returns {Object} Object containing header key-value pairs
 */
function extractHeaders(command) {
	const headers = {};

	// Match all -H or --header flags
	const headerPattern = /(?:-H|--header)\s+(['"])([^'"]+)\1/g;
	let match;

	while ((match = headerPattern.exec(command)) !== null) {
		const headerString = match[2];
		// Split on first colon to separate key and value
		const colonIndex = headerString.indexOf(':');
		if (colonIndex > 0) {
			const key = headerString.substring(0, colonIndex).trim();
			const value = headerString.substring(colonIndex + 1).trim();
			headers[key] = value;
		}
	}

	return headers;
}

/**
 * Extract request body from cURL command
 * @param {string} command - The cURL command
 * @returns {string} The request body
 */
function extractBody(command) {
	// Look for -d, --data, or --data-raw flags
	// Need to handle both single and double quotes, and escaped quotes
	
	// Try to match with single quotes first (simpler case)
	let match = command.match(/(?:-d|--data|--data-raw)\s+'([^']+)'/s);
	if (match) {
		return match[1];
	}
	
	// Try to match with double quotes (need to handle escaped quotes)
	// Match everything between double quotes, handling escaped quotes
	match = command.match(/(?:-d|--data|--data-raw)\s+"((?:[^"\\]|\\.)*)"/s);
	if (match) {
		// Unescape the content: \\" -> ", \\\\ -> \\
		return match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
	}

	return '';
}