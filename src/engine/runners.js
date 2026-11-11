/**
 * Local execution of one node: the reference behaviour every backend must
 * match. The c0mpute backend (./c0mpute.js) sends the same resolved inputs to a
 * remote worker and falls back to these functions.
 */

import jmespath from 'jmespath';
import { paidFetch } from '../lib/paid-fetch.js';
import { XmlJsonTransformNode } from '../nodes/transform-xml-json.js';
import { processTemplate } from '../../apps/web/src/lib/utils/template-processor.js';
import { TRIGGER_KINDS, configOf, kindOf } from './graph.js';
import { compilePluginCall, pluginOutput } from '@meshhook/shared/lib/plugins/compile.js';

export class NodeError extends Error {
	/**
	 * @param {boolean} retryable    worth another attempt (network, 5xx, 429)
	 * @param {number}  retryAfter   minimum seconds before the next attempt, for
	 *                               capacity errors a 1 s backoff would only burn
	 * @param {number}  minAttempts  attempts this error deserves even when the
	 *                               workflow's retry budget is smaller
	 */
	constructor(message, { retryable = false, retryAfter, minAttempts, cause } = {}) {
		super(message);
		this.name = 'NodeError';
		this.retryable = retryable;
		if (retryAfter) this.retryAfter = retryAfter;
		if (minAttempts) this.minAttempts = minAttempts;
		if (cause) this.cause = cause;
	}
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The data `{{templates}}` resolve against: the node's input (as the builder
 * previews it), plus `$input`, `$trigger` and `$nodes.<id|label>`.
 */
export function templateData(input, ctx = {}) {
	// $secrets holds only the secrets this step named, opened for this step.
	const extra = { $input: input, $trigger: ctx.trigger ?? null, $nodes: ctx.nodes ?? {}, $secrets: ctx.secrets ?? {} };
	return isObj(input) ? { ...input, ...extra } : extra;
}

/** `{{path}}` substitution through any JSON value. Unknown paths stay literal. */
export function resolveTemplates(value, data) {
	if (typeof value === 'string') return value.includes('{{') ? processTemplate(value, data) : value;
	if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, data));
	if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveTemplates(v, data)]));
	return value;
}

/** Headers arrive as an object, a JSON string (the builder), or "K: v" lines. */
export function parseHeaders(headers) {
	if (!headers) return {};
	if (isObj(headers)) return { ...headers };
	if (typeof headers !== 'string' || !headers.trim()) return {};
	try {
		const parsed = JSON.parse(headers);
		if (isObj(parsed)) return parsed;
	} catch {
		/* fall through to line format */
	}
	const out = {};
	for (const line of headers.split('\n')) {
		const i = line.indexOf(':');
		if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
	}
	return out;
}

/**
 * Turn an httpCall node into one concrete request: templates resolved,
 * headers parsed, body chosen. Local and remote execution both start here, so
 * a step sends byte-for-byte the same request wherever it runs.
 */
export function resolveHttpRequest(config, input, ctx = {}) {
	const data = templateData(input, ctx);
	const method = String(config.method || 'GET').toUpperCase();
	const headers = Object.fromEntries(
		Object.entries(parseHeaders(config.headers)).map(([k, v]) => [k, String(resolveTemplates(String(v), data))])
	);

	let url = resolveTemplates(String(config.url ?? ''), data);
	const query = config.queryParams ? resolveTemplates(config.queryParams, data) : null;
	if (query && Object.keys(query).length) {
		const u = new URL(url);
		for (const [k, v] of Object.entries(query)) u.searchParams.append(k, String(v));
		url = u.toString();
	}

	let body;
	if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		const configured = config.body;
		const hasConfigured = configured !== undefined && configured !== null && configured !== '';
		// The builder's old behaviour: no configured body sends the input.
		body = hasConfigured ? resolveTemplates(configured, data) : method === 'DELETE' ? undefined : input;
		if (body !== undefined && typeof body !== 'string') {
			body = JSON.stringify(body);
			if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
				headers['Content-Type'] = 'application/json';
			}
		}
	}

	const timeout = Math.min(Math.max(Number(config.timeout) || 30_000, 1_000), 120_000);
	return { url, method, headers, body, timeout };
}

const RETRYABLE_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

async function runHttp(config, input, ctx) {
	const req = resolveHttpRequest(config, input, ctx);
	if (!/^https?:\/\//i.test(req.url)) throw new NodeError(`httpCall needs an http(s) URL, got "${req.url}"`);
	// Retries belong to the step queue (durable, visible in the log), not an
	// in-memory loop that a restart would lose. paidFetch pays x402 gateways
	// when the operator key is unlocked.
	const fetchImpl = ctx.fetch ?? paidFetch;
	let res;
	try {
		res = await fetchImpl(req.url, {
			method: req.method,
			headers: req.headers,
			body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
			signal: AbortSignal.timeout(req.timeout)
		});
	} catch (err) {
		const msg = err?.name === 'TimeoutError' ? `timed out after ${req.timeout}ms` : String(err?.message ?? err);
		throw new NodeError(`${req.method} ${req.url}: ${msg}`, { retryable: true, cause: err });
	}
	return { output: await httpOutput(res, req) };
}

/** Same output shape whether the response came from fetch or a c0mpute worker. */
export async function httpOutput(res, req) {
	const headers = Object.fromEntries(res.headers.entries());
	const text = await res.text();
	const data = parseBody(text, headers['content-type']);
	return checkStatus({ status: res.status, headers, data }, req);
}

export function parseBody(text, contentType = '') {
	if (typeof text !== 'string') return text;
	if (/json/i.test(contentType ?? '')) {
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}
	return text;
}

/** Non-2xx is a node failure; 408/429/5xx are worth retrying. */
export function checkStatus(out, req) {
	if (out.status >= 200 && out.status < 300) return out;
	const snippet = typeof out.data === 'string' ? out.data.slice(0, 300) : JSON.stringify(out.data ?? '').slice(0, 300);
	const err = new NodeError(`${req.method} ${req.url}: HTTP ${out.status} ${snippet}`, {
		retryable: RETRYABLE_STATUS.has(out.status)
	});
	err.status = out.status;
	throw err;
}

function runTransform(config, input) {
	try {
		if (config.template) {
			const text = processTemplate(config.template, input ?? {});
			// A template that builds JSON is most useful downstream as JSON.
			try {
				return { output: JSON.parse(text) };
			} catch {
				return { output: text };
			}
		}
		if (config.expression) return { output: jmespath.search(input ?? null, config.expression) };
		return { output: input };
	} catch (err) {
		throw new NodeError(`transform failed: ${err.message}`);
	}
}

function runConditional(config, input) {
	let value;
	try {
		value = jmespath.search(input ?? null, config.condition ?? config.expression ?? '`true`');
	} catch (err) {
		throw new NodeError(`condition failed: ${err.message}`);
	}
	// JMESPath truthiness: false, null, "", [] and {} are false.
	const truthy = !(value === false || value == null || value === '' || (Array.isArray(value) && !value.length) || (isObj(value) && !Object.keys(value).length));
	return { output: input, branch: truthy ? 'true' : 'false' };
}

/** Normalise the webhook payload the ingest route stored. */
export function triggerOutput(trigger) {
	if (!trigger) return {};
	let body = trigger.body;
	if (typeof body === 'string') {
		try {
			body = JSON.parse(body);
		} catch {
			/* keep text bodies (XML, form data) as text */
		}
	}
	return { headers: trigger.headers ?? {}, query: trigger.query ?? {}, body };
}

/**
 * Run a loop container's body once per item, sequentially. Body steps execute
 * in-process: they are part of one durable step, not separate queue jobs.
 */
async function runLoop(node, config, input, ctx) {
	let items;
	try {
		items = jmespath.search(input ?? null, config.items);
	} catch (err) {
		throw new NodeError(`loop items failed: ${err.message}`);
	}
	if (!Array.isArray(items)) throw new NodeError(`loop items "${config.items}" did not return an array`);
	const body = ctx.loopBody ? ctx.loopBody(node.id) : [];
	const max = Number(process.env.MESHHOOK_LOOP_MAX ?? 1000);
	if (items.length > max) throw new NodeError(`loop has ${items.length} items; the cap is ${max}`);

	const results = [];
	for (let i = 0; i < items.length; i++) {
		let value = items[i];
		for (const child of body) {
			const r = await (ctx.execute ?? runLocal)(child, value, { ...ctx, item: items[i], index: i });
			value = r.output;
		}
		results.push(value);
	}
	return { output: results };
}

/**
 * Execute one node locally.
 * @returns {Promise<{ output: any, branch?: string }>}
 */
export async function runLocal(node, input, ctx = {}) {
	const kind = kindOf(node);
	const config = configOf(node);

	// ctx.trigger is already normalised by triggerOutput().
	if (TRIGGER_KINDS.has(kind)) return { output: ctx.trigger ?? {} };

	switch (kind) {
		case 'httpCall':
			return runHttp(config, input, ctx);
		case 'plugin': {
			let http;
			try {
				http = compilePluginCall(config);
			} catch (err) {
				throw new NodeError(err.message);
			}
			const r = await runHttp(http, input, ctx);
			return { output: pluginOutput(r.output) };
		}
		case 'transform':
			return runTransform(config, input);
		case 'xmlJsonTransform':
			try {
				return { output: new XmlJsonTransformNode(config).transform(input) };
			} catch (err) {
				throw new NodeError(`xml/json transform failed: ${err.message}`);
			}
		case 'ai': {
			const { runAi } = await import('./ai.js');
			return runAi(config, input, ctx, { fetch: ctx.fetch });
		}
		case 'conditional':
			return runConditional(config, input);
		case 'branch':
			// Fan-out: every outgoing edge fires with the same input.
			return { output: input };
		case 'loop':
			return runLoop(node, config, input, ctx);
		case 'delay':
			// The orchestrator turns a delay into a scheduled redelivery; reaching
			// here means the wait is over.
			return { output: input };
		case 'terminate':
			return { output: input };
		default:
			throw new NodeError(`Unknown node kind "${kind}" for node ${node.id}`);
	}
}
