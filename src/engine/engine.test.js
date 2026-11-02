import { describe, it, expect } from 'bun:test';
import { buildGraph, kindOf } from './graph.js';
import { classify, decide, inputFor, replay } from './scheduler.js';
import { NodeError, resolveHttpRequest, runLocal, triggerOutput } from './runners.js';
import { C0mputeClient, carriesCredentials, executeNode, executionMode, planRemote } from './c0mpute.js';
import { readStream, runAi } from './ai.js';

const n = (id, type, config = {}, extra = {}) => ({ id, type: 'default', data: { type, label: id, config }, ...extra });
const e = (source, target, sourceHandle) => ({ id: `${source}-${target}`, source, target, ...(sourceHandle ? { sourceHandle } : {}) });
const ev = (type, payload) => ({ type, payload: JSON.stringify(payload) });
const ok = (id, output, branch) => ev('step_succeeded', { node: { id }, output, ...(branch ? { branch } : {}) });

const jsonResponse = (status, body, headers = {}) =>
	new Response(typeof body === 'string' ? body : JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});

describe('graph', () => {
	it('reads the real kind from data.type and keeps loop bodies out of the DAG', () => {
		const g = buildGraph({
			nodes: [n('hook', 'webhook'), { id: 'L', type: 'loopContainer', data: { type: 'loop', config: { items: 'body.items' } } }, n('a', 'transform', {}, { parentId: 'L' }), n('b', 'httpCall', {}, { parentId: 'L' })],
			edges: [e('hook', 'L'), e('b', 'a')]
		});
		expect(g.nodes.map((x) => x.id)).toEqual(['hook', 'L']);
		expect(kindOf(g.byId.get('L'))).toBe('loop');
		expect(g.loopBody('L').map((x) => x.id)).toEqual(['b', 'a']);
	});

	it('accepts the stored TEXT form', () => {
		expect(buildGraph(JSON.stringify({ nodes: [n('a', 'webhook')], edges: [] })).roots).toHaveLength(1);
	});
});

describe('scheduler', () => {
	const g = buildGraph({
		nodes: [n('hook', 'webhook'), n('if', 'conditional', { condition: 'body.vip' }), n('yes', 'transform'), n('no', 'transform'), n('end', 'transform')],
		edges: [e('hook', 'if'), e('if', 'yes', 'true'), e('if', 'no', 'false'), e('yes', 'end'), e('no', 'end')]
	});

	it('starts at the trigger', () => {
		expect(decide(g, replay([ev('run_created', { body: '{}' })]))).toEqual({ action: 'dispatch', nodes: [g.byId.get('hook')] });
	});

	it('waits while a step is running', () => {
		const s = replay([ev('run_created', {}), ev('step_started', { node: { id: 'hook' } })]);
		expect(decide(g, s).action).toBe('wait');
	});

	it('follows only the chosen branch and skips the other', () => {
		const s = replay([ev('run_created', {}), ok('hook', { body: { vip: true } }), ok('if', { body: { vip: true } }, 'true')]);
		const status = classify(g, s);
		expect(status.get('yes')).toBe('ready');
		expect(status.get('no')).toBe('skipped');
		expect(status.get('end')).toBe('waiting');
		expect(decide(g, s).nodes.map((x) => x.id)).toEqual(['yes']);
	});

	it('runs a merge node once the taken branch finishes, with that branch as input', () => {
		const s = replay([ev('run_created', {}), ok('hook', {}), ok('if', {}, 'false'), ok('no', { picked: 'no' })]);
		expect(decide(g, s).nodes.map((x) => x.id)).toEqual(['end']);
		expect(inputFor(g, s, g.byId.get('end'))).toEqual({ picked: 'no' });
	});

	it('completes when every node is done or skipped', () => {
		const s = replay([ev('run_created', {}), ok('hook', {}), ok('if', {}, 'false'), ok('no', {}), ok('end', {})]);
		expect(decide(g, s)).toEqual({ action: 'complete' });
	});

	it('fails on a final step failure and ignores retryable ones', () => {
		const retry = replay([ev('run_created', {}), ev('step_failed', { node: { id: 'hook' }, error: 'x', final: false })]);
		expect(decide(g, retry).action).not.toBe('fail');
		const dead = replay([ev('run_created', {}), ev('step_failed', { node: { id: 'hook' }, error: 'boom', final: true })]);
		expect(decide(g, dead)).toEqual({ action: 'fail', error: 'node hook: boom' });
	});

	it('stops at terminate even with nodes left', () => {
		const s = replay([ev('run_created', {}), ok('hook', {}), ev('run_terminated', { node: { id: 'x' } })]);
		expect(decide(g, s)).toEqual({ action: 'complete' });
	});

	it('merges several active inputs by source id', () => {
		const fan = buildGraph({ nodes: [n('h', 'webhook'), n('a', 'transform'), n('b', 'transform'), n('m', 'transform')], edges: [e('h', 'a'), e('h', 'b'), e('a', 'm'), e('b', 'm')] });
		const s = replay([ok('h', {}), ok('a', 1), ok('b', 2)]);
		expect(inputFor(fan, s, fan.byId.get('m'))).toEqual({ a: 1, b: 2 });
	});
});

describe('local runners', () => {
	const trigger = triggerOutput({ headers: { 'x-a': '1' }, body: '{"user":{"name":"Ada"},"items":[1,2,3]}' });

	it('parses the webhook body as JSON', () => {
		expect(trigger.body.user.name).toBe('Ada');
	});

	it('runs JMESPath and template transforms', async () => {
		expect((await runLocal(n('t', 'transform', { expression: 'body.items[1]' }), trigger)).output).toBe(2);
		expect((await runLocal(n('t', 'transform', { template: '{"hi":"{{body.user.name}}"}' }), trigger)).output).toEqual({ hi: 'Ada' });
	});

	it('branches on a JMESPath condition', async () => {
		expect((await runLocal(n('c', 'conditional', { condition: 'body.items' }), trigger)).branch).toBe('true');
		expect((await runLocal(n('c', 'conditional', { condition: 'body.nope' }), trigger)).branch).toBe('false');
	});

	it('runs a loop body per item', async () => {
		const body = [n('dbl', 'transform', { template: '{{this}}{{this}}' })];
		const r = await runLocal({ id: 'L', type: 'loopContainer', data: { type: 'loop', config: { items: 'body.items' } } }, trigger, { loopBody: () => body });
		expect(r.output).toEqual([11, 22, 33]);
	});

	it('resolves templates in url, headers and body from the input, $trigger and $nodes', () => {
		const req = resolveHttpRequest(
			{ url: 'https://api.example.com/u/{{id}}', method: 'post', headers: '{"X-Name":"{{$trigger.body.user.name}}"}', body: '{"prev":"{{$nodes.step1.ok}}"}' },
			{ id: 7 },
			{ trigger, nodes: { step1: { ok: 'yes' } } }
		);
		expect(req).toMatchObject({ url: 'https://api.example.com/u/7', method: 'POST', headers: { 'X-Name': 'Ada' }, body: '{"prev":"yes"}' });
	});

	it('sends the input as the body when none is configured', () => {
		const req = resolveHttpRequest({ url: 'https://x.test', method: 'POST' }, { a: 1 });
		expect(req.body).toBe('{"a":1}');
		expect(req.headers['Content-Type']).toBe('application/json');
	});

	it('makes HTTP calls and classifies failures', async () => {
		const fetch200 = async () => jsonResponse(201, { id: 1 });
		const r = await runLocal(n('h', 'httpCall', { url: 'https://x.test', method: 'GET' }), {}, { fetch: fetch200 });
		expect(r.output).toMatchObject({ status: 201, data: { id: 1 } });

		const fetch503 = async () => jsonResponse(503, 'busy');
		await expect(runLocal(n('h', 'httpCall', { url: 'https://x.test' }), {}, { fetch: fetch503 })).rejects.toMatchObject({ retryable: true, status: 503 });
		const fetch404 = async () => jsonResponse(404, 'gone');
		await expect(runLocal(n('h', 'httpCall', { url: 'https://x.test' }), {}, { fetch: fetch404 })).rejects.toMatchObject({ retryable: false });
	});

	it('rejects unknown kinds as a final failure', async () => {
		await expect(runLocal(n('z', 'teleport'), {})).rejects.toBeInstanceOf(NodeError);
	});
});

describe('c0mpute executor', () => {
	const settings = { execution: 'c0mpute' };
	const bridge = (handler) => {
		const calls = [];
		const client = new C0mputeClient({
			url: 'http://bridge.test',
			token: 'x'.repeat(32),
			fetch: async (url, init) => {
				calls.push({ url, body: JSON.parse(init.body) });
				return handler(JSON.parse(init.body));
			}
		});
		return { client, calls };
	};

	it('picks the mode from workflow settings, then env', () => {
		expect(executionMode({}, {})).toBe('local');
		expect(executionMode({}, { C0MPUTE_JOBS_TOKEN: 't' })).toBe('c0mpute');
		expect(executionMode({ execution: 'local' }, { C0MPUTE_JOBS_TOKEN: 't' })).toBe('local');
		expect(executionMode({ c0mpute: { private: true } }, { MESHHOOK_EXECUTOR: 'c0mpute' })).toBe('local');
	});

	it('keeps credentials off the network unless peers are pinned', () => {
		const node = n('h', 'httpCall', { url: 'https://api.test', headers: { Authorization: 'Bearer s3cret' } });
		expect(planRemote(node, {}).local).toMatch(/credentials/);
		expect(planRemote(node, {}, {}, { c0mpute: { allowPeers: ['12D3KooW'] } }).spec.kind).toBe('http_call');
		expect(carriesCredentials({ url: 'https://u:p@x.test', headers: {} })).toBe(true);
		expect(carriesCredentials({ url: 'https://x.test?api_key=1', headers: {} })).toBe(true);
		expect(carriesCredentials({ url: 'https://x.test', headers: { Accept: 'json' } })).toBe(false);
		expect(planRemote(n('t', 'transform', { template: '{{a}}' }), {}).local).toBeTruthy();
	});

	it('runs a transform on a worker and records where', async () => {
		const { client, calls } = bridge(() => jsonResponse(200, { job_id: 'j1', worker: '12D3KooWorker', price: 0, output_hash: 'abc', result: { v: 1, ok: true, output: [2, 4], duration_ms: 3 } }));
		const r = await executeNode(n('t', 'transform', { expression: 'items[*].x' }), { items: [] }, {}, { settings, client });
		expect(r.output).toEqual([2, 4]);
		expect(r.executed_on).toMatchObject({ backend: 'c0mpute', worker: '12D3KooWorker', job_id: 'j1' });
		expect(calls[0].body).toMatchObject({ workload: 'workflow.step', spec: { v: 1, kind: 'transform', config: { expression: 'items[*].x' } } });
	});

	it('maps a worker http_call result to the local output shape', async () => {
		const { client, calls } = bridge(() =>
			jsonResponse(200, { job_id: 'j2', worker: 'w', price: 0, output_hash: 'h', result: { v: 1, ok: true, output: { status: 200, headers: { 'content-type': 'application/json' }, body: { hi: 1 } }, duration_ms: 9 } })
		);
		const r = await executeNode(n('h', 'httpCall', { url: 'https://api.test/{{id}}', method: 'GET' }), { id: 5 }, {}, { settings, client });
		expect(r.output).toEqual({ status: 200, headers: { 'content-type': 'application/json' }, data: { hi: 1 } });
		expect(calls[0].body.spec.config.url).toBe('https://api.test/5');
	});

	it('fails the node on a worker non-2xx', async () => {
		const { client } = bridge(() => jsonResponse(200, { job_id: 'j', worker: 'w', result: { v: 1, ok: true, output: { status: 500, headers: {}, body: 'x' } } }));
		await expect(executeNode(n('h', 'httpCall', { url: 'https://api.test' }), {}, {}, { settings, client })).rejects.toMatchObject({ retryable: true, status: 500 });
	});

	it('falls back to local when nobody bids', async () => {
		const { client } = bridge(() => jsonResponse(503, { error: 'no_bids' }));
		const r = await executeNode(n('t', 'transform', { expression: 'a' }), { a: 9 }, {}, { settings, client });
		expect(r).toMatchObject({ output: 9, executed_on: { backend: 'local', reason: 'c0mpute: no_bids' } });
	});

	it('falls back to local when the bridge is down', async () => {
		const client = new C0mputeClient({ url: 'http://bridge.test', token: 't', fetch: async () => { throw new Error('ECONNREFUSED'); } });
		const r = await executeNode(n('t', 'transform', { expression: 'a' }), { a: 1 }, {}, { settings, client });
		expect(r.executed_on.reason).toMatch(/bridge unreachable/);
	});

	it('pays a 402 locally with the x402 key instead of failing', async () => {
		const { client } = bridge(() => jsonResponse(200, { job_id: 'j', worker: 'w', result: { v: 1, ok: true, output: { status: 402, headers: {}, body: '{}' } } }));
		const r = await executeNode(n('h', 'httpCall', { url: 'https://paid.test', method: 'GET' }), {}, { fetch: async () => jsonResponse(200, { paid: true }) }, { settings, client });
		expect(r.output.data).toEqual({ paid: true });
		expect(r.executed_on.reason).toMatch(/402/);
	});
});

describe('ai node (c0mpute inference)', () => {
	const sse = (events) =>
		new Response(events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } });

	it('reads a token stream', async () => {
		const out = await readStream(sse([['meta', { model: 'qwen2.5:7b' }], ['token', { text: 'he' }], ['token', { text: 'llo' }], ['done', {}]]).body);
		expect(out).toEqual({ text: 'hello', model: 'qwen2.5:7b' });
	});

	it('submits p2p_only with templated prompts, falls through busy models, parses JSON', async () => {
		const posts = [];
		const fetch = async (url, init) => {
			if (url.endsWith('/api/chat')) {
				const body = JSON.parse(init.body);
				posts.push(body);
				if (body.modelName === 'qwen2.5:7b') return jsonResponse(503, { error: 'busy' });
				return jsonResponse(200, { jobId: 'job9', source: 'p2p', model: body.modelName, provider: { name: 'bonita' } });
			}
			return sse([['token', { text: '```json\n{"score": 8}\n```' }], ['done', {}]]);
		};
		const r = await runAi({ prompt: 'Rate {{name}}', json: true }, { name: 'Ada' }, {}, { env: { MESHHOOK_AI_MODELS: 'qwen2.5:7b,qwen3:4b' }, fetch });
		expect(posts.every((p) => p.p2p_only === true)).toBe(true);
		expect(posts[0].messages.at(-1).content).toBe('Rate Ada');
		expect(posts.map((p) => p.modelName)).toEqual(['qwen2.5:7b', 'qwen3:4b']);
		expect(r.output).toMatchObject({ json: { score: 8 }, model: 'qwen3:4b', provider: 'bonita', job_id: 'job9' });
		expect(r.executed_on.backend).toBe('c0mpute-inference');
	});

	it('defaults to the small models several nodes serve', async () => {
		const { aiSettings } = await import('./ai.js');
		expect(aiSettings({})).toMatchObject({ models: ['qwen2.5:1.5b', 'qwen2.5:0.5b'], timeoutMs: 120_000 });
	});

	it('refuses a job that did not land on a peer', async () => {
		const fetch = async () => jsonResponse(200, { jobId: 'j', source: 'hosted' });
		await expect(runAi({ prompt: 'x' }, {}, {}, { env: { MESHHOOK_AI_MODELS: 'm' }, fetch })).rejects.toMatchObject({ retryable: true });
	});
});

describe('workflow settings (editor -> definition.settings)', async () => {
	const { sanitizeSettings, runsOnFrom, withRunsOn } = await import('../../apps/web/src/lib/utils/workflow-settings.js');
	const peer = '12D3KooWGzBkGP2bXn8n2ZgqXgUyyM8VdtFYvT7UX1g2pT7ZqgnH';

	it('keeps only what the engine understands', () => {
		expect(sanitizeSettings({ execution: 'mars', c0mpute: { allowPeers: [peer, 'nope; rm -rf'], maxPrice: '0.01', private: 'yes' }, retryAttempts: 99, evil: 1 })).toEqual({
			c0mpute: { allowPeers: [peer], maxPrice: 0.01 },
			retryAttempts: 10
		});
		expect(sanitizeSettings({})).toBeNull();
	});

	it('round-trips the Runs on choice without losing other settings', () => {
		const base = { retryAttempts: 2, c0mpute: { allowPeers: [peer] } };
		for (const choice of ['auto', 'local', 'c0mpute', 'private']) expect(runsOnFrom(withRunsOn(base, choice))).toBe(choice);
		expect(withRunsOn({ execution: 'c0mpute', c0mpute: { private: true } }, 'auto')).toEqual({});
		expect(withRunsOn(base, 'private')).toEqual({ retryAttempts: 2, c0mpute: { allowPeers: [peer], private: true } });
	});
});

describe('branch fan-out', () => {
	it('fires every edge out of a branch node', () => {
		const g = buildGraph({ nodes: [n('h', 'webhook'), n('b', 'branch'), n('x', 'httpCall'), n('y', 'httpCall')], edges: [e('h', 'b'), e('b', 'x'), e('b', 'y')] });
		const s = replay([ok('h', {}), ok('b', { v: 1 })]);
		expect(decide(g, s).nodes.map((x) => x.id)).toEqual(['x', 'y']);
	});
});

describe('ai capacity backoff', () => {
	it('marks retryable AI errors with a long backoff and a bigger budget', async () => {
		const fetch = async () => new Response('<html>down for maintenance</html>', { status: 503 });
		const err = await runAi({ prompt: 'x' }, {}, {}, { env: { MESHHOOK_AI_MODELS: 'm' }, fetch }).catch((e) => e);
		expect(err).toMatchObject({ retryable: true, retryAfter: 30, minAttempts: 5 });
	});
});
