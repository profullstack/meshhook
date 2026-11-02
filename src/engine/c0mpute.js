/**
 * Run workflow steps on the c0mpute network.
 *
 * A local `c0mpute jobs serve` bridge (a c0mpute peer on loopback) auctions
 * each step on the `workflow.step` topic; the cheapest/fastest worker runs it
 * and the bridge returns the hash-verified result. Contract v1:
 *
 *   POST {C0MPUTE_JOBS_URL}/v1/jobs   Authorization: Bearer {C0MPUTE_JOBS_TOKEN}
 *   { workload: "workflow.step", spec: { v: 1, kind, config, input }, max_price?, allow_peers? }
 *   200 { job_id, worker, price, output_hash, result: { v, ok, output | error, duration_ms } }
 *   503 { error: "no_bids" }  502 worker_failed  504 timeout
 *
 * What may leave the box. A worker sees the whole spec, so:
 *   - transform (JMESPath) and httpCall are the only kinds offered; template
 *     transforms, XML parsing, branches and loops are cheap and stay local.
 *   - an httpCall carrying credentials (auth-ish headers, `{{$secret…}}`,
 *     user:pass in the URL) stays local unless the workflow pins trusted
 *     workers with `settings.c0mpute.allowPeers`.
 *   - `settings.c0mpute.private: true` keeps every step of a workflow local.
 * Anything the network cannot do (no bids, bridge down, a 402 only our x402
 * key can pay) falls back to local execution, and the step log says so.
 */

import { configOf, kindOf } from './graph.js';
import { NodeError, checkStatus, parseBody, resolveHttpRequest, runLocal } from './runners.js';

const SENSITIVE_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie)$|key|token|secret|signature|session|auth|password/i;

/** Backend selection: env default, overridable per workflow. */
export function executionMode(settings = {}, env = process.env) {
	const wf = settings.execution ?? settings.c0mpute?.mode;
	if (settings.c0mpute?.private) return 'local';
	if (wf === 'local' || wf === 'c0mpute') return wf;
	const mode = (env.MESHHOOK_EXECUTOR ?? '').toLowerCase();
	if (mode === 'local' || mode === 'c0mpute') return mode;
	// auto: use the network when a bridge is configured.
	return env.C0MPUTE_JOBS_TOKEN ? 'c0mpute' : 'local';
}

/** Does a resolved request carry anything a stranger must not see? */
export function carriesCredentials(req, rawConfig = {}) {
	if (Object.keys(req.headers ?? {}).some((h) => SENSITIVE_HEADER.test(h))) return true;
	try {
		const u = new URL(req.url);
		if (u.username || u.password) return true;
		for (const k of u.searchParams.keys()) if (SENSITIVE_HEADER.test(k)) return true;
	} catch {
		/* invalid URL: the worker will reject it */
	}
	return /\{\{\s*\$?secrets?\b/i.test(JSON.stringify(rawConfig));
}

/**
 * Build the network spec for a node, or explain why it stays local.
 * @returns {{ spec: object } | { local: string }}
 */
export function planRemote(node, input, ctx = {}, settings = {}) {
	const kind = kindOf(node);
	const config = configOf(node);
	const allowPeers = settings.c0mpute?.allowPeers ?? [];

	if (kind === 'transform') {
		if (!config.expression || config.template) return { local: 'template transforms run locally' };
		return { spec: { v: 1, kind: 'transform', config: { expression: config.expression }, input: input ?? null } };
	}

	if (kind === 'httpCall') {
		const req = resolveHttpRequest(config, input, ctx);
		if (carriesCredentials(req, config) && allowPeers.length === 0) {
			return { local: 'request carries credentials; pin settings.c0mpute.allowPeers to send it to the network' };
		}
		const body = req.body === undefined ? undefined : req.body;
		return {
			spec: {
				v: 1,
				kind: 'http_call',
				config: { url: req.url, method: req.method, headers: req.headers, body, timeout_ms: Math.min(req.timeout, 30_000) }
			},
			req
		};
	}

	return { local: `${kind} runs locally` };
}

export class C0mputeClient {
	constructor({ url = process.env.C0MPUTE_JOBS_URL ?? 'http://127.0.0.1:8788', token = process.env.C0MPUTE_JOBS_TOKEN, fetch: f = globalThis.fetch } = {}) {
		this.url = url.replace(/\/$/, '');
		this.token = token;
		this.fetch = f;
	}

	/** @returns {Promise<{ ok: true, job: object } | { ok: false, reason: string, fatal?: boolean }>} */
	async submit(spec, { maxPrice, allowPeers, timeoutMs = 60_000 } = {}) {
		if (!this.token) return { ok: false, reason: 'C0MPUTE_JOBS_TOKEN is not set' };
		let res;
		try {
			res = await this.fetch(`${this.url}/v1/jobs`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` },
				body: JSON.stringify({
					workload: 'workflow.step',
					spec,
					...(maxPrice != null ? { max_price: maxPrice } : {}),
					...(allowPeers?.length ? { allow_peers: allowPeers } : {}),
					timeout_ms: timeoutMs
				}),
				signal: AbortSignal.timeout(timeoutMs + 5_000)
			});
		} catch (err) {
			return { ok: false, reason: `bridge unreachable: ${err?.message ?? err}` };
		}
		const body = await res.json().catch(() => ({}));
		if (res.status === 200 && body?.result) return { ok: true, job: body };
		const reason = body?.error ? `${body.error}${body.detail ? `: ${body.detail}` : ''}` : `bridge HTTP ${res.status}`;
		// 400 means the spec itself is wrong; local execution would hit the same.
		return { ok: false, reason, fatal: res.status === 400 };
	}

	async health() {
		try {
			const res = await this.fetch(`${this.url}/healthz`, { signal: AbortSignal.timeout(3_000) });
			return res.ok ? await res.json() : null;
		} catch {
			return null;
		}
	}
}

/**
 * Execute a node, preferring the network when the workflow allows it.
 * @returns {Promise<{ output: any, branch?: string, executed_on: object }>}
 */
export async function executeNode(node, input, ctx = {}, { settings = {}, client = new C0mputeClient(), env = process.env } = {}) {
	const local = async (reason) => {
		const r = await runLocal(node, input, { ...ctx, execute: (n, i, c) => runLocal(n, i, c) });
		return { ...r, executed_on: r.executed_on ?? { backend: 'local', ...(reason ? { reason } : {}) } };
	};

	if (executionMode(settings, env) !== 'c0mpute') return local();

	const plan = planRemote(node, input, ctx, settings);
	if (plan.local) return local(plan.local);

	const submitted = await client.submit(plan.spec, {
		maxPrice: settings.c0mpute?.maxPrice ?? (env.C0MPUTE_MAX_PRICE != null ? Number(env.C0MPUTE_MAX_PRICE) : undefined),
		allowPeers: settings.c0mpute?.allowPeers
	});
	if (!submitted.ok) {
		if (submitted.fatal) throw new NodeError(`c0mpute rejected the step: ${submitted.reason}`);
		return local(`c0mpute: ${submitted.reason}`);
	}

	const { job } = submitted;
	const on = { backend: 'c0mpute', job_id: job.job_id, worker: job.worker, price: job.price, output_hash: job.output_hash, duration_ms: job.result.duration_ms };

	if (!job.result.ok) {
		// Transport-level failure on the worker (DNS, refused, SSRF guard). Our
		// own network may still reach it, e.g. an allowlisted partner API.
		return local(`c0mpute worker failed: ${job.result.error}`);
	}

	if (plan.spec.kind === 'transform') return { output: job.result.output, executed_on: on };

	// http_call: { status, headers, body } -> the local { status, headers, data } shape.
	const r = job.result.output ?? {};
	// A 402 is an x402 offer: only this process holds the payer key.
	if (r.status === 402) return local('402 Payment Required: paid locally with the x402 key');
	const headers = r.headers ?? {};
	const data = typeof r.body === 'string' ? parseBody(r.body, headers['content-type']) : r.body;
	try {
		return { output: checkStatus({ status: r.status, headers, data }, plan.req), executed_on: on };
	} catch (err) {
		err.executed_on = on;
		throw err;
	}
}
