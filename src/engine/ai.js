/**
 * The `ai` node: a prompt answered by an open model on a c0mpute node.
 *
 * Calls go to Infernet's open-market chat API, the peer network behind
 * c0mpute (same client as bot.seo's src/llm.ts):
 *
 *   POST {INFERNET_URL}/api/chat {messages, maxTokens, temperature, p2p_only, modelName?}
 *     -> {jobId, source, model, provider}
 *   GET  {INFERNET_URL}/api/chat/stream/<jobId>   SSE: meta, token..., done | error
 *
 * `p2p_only` is always on: a workflow step never lands on a billed hosted
 * provider (house rule: free open models first, no paid fallback without an
 * explicit opt-in). A trusted-client key (`ifc_…`, INFERNET_CLIENT_KEY) gets its
 * own hourly budget instead of the public per-IP one.
 */

import { NodeError, resolveTemplates, templateData } from './runners.js';

const DEFAULT_MODELS = 'qwen2.5:7b,qwen3:4b,gemma3:4b';

export function aiSettings(env = process.env) {
	return {
		baseUrl: (env.INFERNET_URL ?? env.C0MPUTE_URL ?? 'https://infernetprotocol.com').replace(/\/$/, ''),
		apiKey: (env.INFERNET_CLIENT_KEY ?? env.C0MPUTE_API_KEY)?.trim() || undefined,
		models: (env.MESHHOOK_AI_MODELS ?? DEFAULT_MODELS).split(',').map((m) => m.trim()).filter(Boolean),
		timeoutMs: Number(env.MESHHOOK_AI_TIMEOUT_MS ?? 300_000)
	};
}

/** Reads SSE `meta`, `token` and `done` events until `done` or `error`. */
export async function readStream(body) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let text = '';
	let model;
	for (;;) {
		const { value, done } = await reader.read();
		if (value) buffer += decoder.decode(value, { stream: true });
		let cut;
		while ((cut = buffer.indexOf('\n\n')) >= 0) {
			const block = buffer.slice(0, cut);
			buffer = buffer.slice(cut + 2);
			const event = /^event:\s*(.+)$/m.exec(block)?.[1]?.trim();
			const raw = block
				.split('\n')
				.filter((l) => l.startsWith('data:'))
				.map((l) => l.slice(5).trimStart())
				.join('\n');
			if (!event || !raw) continue;
			let data;
			try {
				data = JSON.parse(raw);
			} catch {
				continue;
			}
			if (event === 'meta' && typeof data.model === 'string') model = data.model;
			else if (event === 'token' && typeof data.text === 'string') text += data.text;
			else if (event === 'done') {
				await reader.cancel().catch(() => undefined);
				return { text: typeof data.text === 'string' && data.text ? data.text : text, model };
			} else if (event === 'error') {
				await reader.cancel().catch(() => undefined);
				throw new NodeError(`c0mpute job failed: ${data.message ?? data.error ?? 'unknown error'}`, { retryable: true });
			}
		}
		if (done) break;
	}
	throw new NodeError(text ? 'the c0mpute stream ended before the answer finished' : 'the c0mpute stream ended without an answer', {
		retryable: true
	});
}

/**
 * config: { prompt, system?, model?, maxTokens?, temperature?, json? }
 * `prompt` and `system` take {{templates}} like every other node.
 * Output: { text, json?, model, provider, job_id }
 */
export async function runAi(config, input, ctx = {}, { env = process.env, fetch: f = globalThis.fetch } = {}) {
	const s = aiSettings(env);
	const data = templateData(input, ctx);
	const user = String(resolveTemplates(config.prompt ?? '', data)).trim();
	if (!user) throw new NodeError('ai node needs a prompt');
	const system = config.system ? String(resolveTemplates(config.system, data)) : undefined;
	const models = config.model ? [config.model, ...s.models.filter((m) => m !== config.model)] : s.models;

	const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }];
	const signal = AbortSignal.timeout(s.timeoutMs);
	const submit = (modelName) =>
		f(`${s.baseUrl}/api/chat`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json',
				...(s.apiKey ? { authorization: `Bearer ${s.apiKey}` } : {})
			},
			body: JSON.stringify({
				messages,
				maxTokens: Number(config.maxTokens) || 1024,
				temperature: config.temperature != null ? Number(config.temperature) : config.json ? 0.2 : 0.6,
				p2p_only: true,
				...(modelName ? { modelName } : {})
			}),
			signal
		});

	try {
		// Best model first; a busy one (503/400) moves on. Never "any node".
		let res = null;
		for (const m of models) {
			res = await submit(m);
			if (res.status !== 503 && res.status !== 400) break;
		}
		if (!res || res.status === 503 || res.status === 400) {
			throw new NodeError(`no c0mpute node is serving ${models.join(', ')} right now`, { retryable: true });
		}
		const job = await res.json().catch(() => ({}));
		if (!res.ok || !job.jobId) throw new NodeError(`c0mpute ${res.status}: ${job.error ?? 'no job was created'}`, { retryable: res.status >= 500 || res.status === 429 });
		if (job.source !== 'p2p') throw new NodeError(`no c0mpute node took the job (source ${job.source ?? 'unknown'})`, { retryable: true });

		const stream = await f(`${s.baseUrl}/api/chat/stream/${job.jobId}`, { headers: { accept: 'text/event-stream' }, signal });
		if (!stream.ok || !stream.body) throw new NodeError(`c0mpute stream ${stream.status}`, { retryable: true });
		const out = await readStream(stream.body);

		const output = { text: out.text, model: out.model ?? job.model ?? null, provider: job.provider?.name ?? null, job_id: job.jobId };
		if (config.json) {
			const m = /```(?:json)?\s*([\s\S]*?)```/.exec(out.text);
			try {
				output.json = JSON.parse((m ? m[1] : out.text).trim());
			} catch {
				throw new NodeError('ai node asked for JSON but the model did not return valid JSON', { retryable: true });
			}
		}
		return { output, executed_on: { backend: 'c0mpute-inference', job_id: job.jobId, model: output.model, provider: output.provider } };
	} catch (err) {
		if (err instanceof NodeError) throw err;
		const msg = err?.name === 'TimeoutError' ? `timed out after ${s.timeoutMs}ms` : String(err?.message ?? err);
		throw new NodeError(`c0mpute inference: ${msg}`, { retryable: true, cause: err });
	}
}
