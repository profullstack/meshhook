/**
 * Event-sourced run state and "what runs next".
 *
 * Everything here is a pure function of the event log, so a redelivered job
 * recomputes the same answer and any number of orchestrators can share runs.
 *
 * Events this module reads (payload shapes):
 *   run_created     { headers, body, query? }              the trigger payload
 *   step_started    { node: { id, kind } }
 *   step_succeeded  { node: { id, kind }, output, branch?, executed_on? }
 *   step_failed     { node, error, attempt, final? }
 *   run_terminated  { node }                               a terminate node fired
 *   run_completed / run_failed
 */

import { BRANCH_KINDS, kindOf } from './graph.js';

const parse = (p) => {
	if (p == null) return {};
	if (typeof p === 'string') {
		try {
			return JSON.parse(p);
		} catch {
			return {};
		}
	}
	return p;
};

/** Fold the event log into run state. */
export function replay(events) {
	const state = {
		trigger: null,
		started: new Set(),
		succeeded: new Map(), // id -> { output, branch }
		failed: new Map(), // id -> error (final failures only)
		terminated: false,
		finished: false
	};

	for (const ev of events) {
		const p = parse(ev.payload);
		switch (ev.type) {
			case 'run_created':
				state.trigger = p;
				break;
			case 'step_started':
				if (p.node?.id) state.started.add(p.node.id);
				break;
			case 'step_succeeded':
				if (p.node?.id) state.succeeded.set(p.node.id, { output: p.output, branch: p.branch });
				break;
			case 'step_failed':
				if (p.final && p.node?.id) state.failed.set(p.node.id, p.error);
				break;
			case 'run_terminated':
				state.terminated = true;
				break;
			case 'run_completed':
			case 'run_failed':
			case 'run_canceled':
				state.finished = true;
				break;
		}
	}
	return state;
}

/** Does this edge carry flow out of a finished node? */
function edgeActive(graph, edge, state) {
	const src = state.succeeded.get(edge.source);
	if (!src) return false;
	const kind = kindOf(graph.byId.get(edge.source));
	if (!BRANCH_KINDS.has(kind)) return true;
	// Branch nodes fire only the edge whose handle matches their decision.
	// An edge with no handle is the default ("true") path.
	const handle = String(edge.sourceHandle ?? edge.label ?? 'true').toLowerCase();
	return handle === String(src.branch).toLowerCase();
}

/**
 * Settle every top-level node into one of:
 *   done | failed | skipped | running | ready | waiting
 * Skips propagate: a node whose inputs are all settled but none carry flow is
 * skipped, so the run can still finish down the branch that was taken.
 */
export function classify(graph, state) {
	const status = new Map();
	const order = graph.nodes; // incoming lists make a fixed-point loop cheap enough

	let changed = true;
	while (changed) {
		changed = false;
		for (const n of order) {
			if (status.has(n.id)) continue;
			let s = null;
			if (state.succeeded.has(n.id)) s = 'done';
			else if (state.failed.has(n.id)) s = 'failed';
			else {
				const ins = graph.incoming.get(n.id);
				if (ins.length === 0) {
					s = state.started.has(n.id) ? 'running' : 'ready';
				} else {
					const settled = ins.every((e) => ['done', 'skipped', 'failed'].includes(status.get(e.source)));
					if (!settled) continue; // decide on a later pass
					const active = ins.some((e) => edgeActive(graph, e, state));
					if (!active) s = 'skipped';
					else s = state.started.has(n.id) ? 'running' : 'ready';
				}
			}
			status.set(n.id, s);
			changed = true;
		}
	}
	for (const n of order) if (!status.has(n.id)) status.set(n.id, 'waiting');
	return status;
}

/**
 * Decide what the orchestrator does next for a run.
 * @returns {{ action: 'dispatch', nodes: object[] } | { action: 'complete' } |
 *           { action: 'fail', error: string } | { action: 'wait' } | { action: 'noop' }}
 */
export function decide(graph, state) {
	if (state.finished) return { action: 'noop' };
	if (state.failed.size) {
		const [id, error] = [...state.failed][0];
		return { action: 'fail', error: `node ${id}: ${error}` };
	}
	if (state.terminated) return { action: 'complete' };
	if (graph.nodes.length === 0) return { action: 'complete' };

	const status = classify(graph, state);
	const ready = graph.nodes.filter((n) => status.get(n.id) === 'ready');
	if (ready.length) return { action: 'dispatch', nodes: ready };
	if ([...status.values()].some((s) => s === 'running' || s === 'waiting')) return { action: 'wait' };
	return { action: 'complete' };
}

/**
 * The input a node receives: the trigger payload for roots, the single
 * upstream output for a chain, or `{ [sourceId]: output }` when several
 * active edges merge.
 */
export function inputFor(graph, state, node) {
	const ins = graph.incoming.get(node.id) ?? [];
	if (ins.length === 0) return state.trigger;
	const active = ins.filter((e) => edgeActive(graph, e, state));
	if (active.length === 1) return state.succeeded.get(active[0].source).output;
	return Object.fromEntries(active.map((e) => [e.source, state.succeeded.get(e.source).output]));
}

/** Every finished node's output, by id and by label, for `{{$nodes.x}}`. */
export function nodeOutputs(graph, state) {
	const out = {};
	for (const [id, { output }] of state.succeeded) {
		out[id] = output;
		const label = graph.byId.get(id)?.data?.label;
		if (label && !(label in out)) out[label] = output;
	}
	return out;
}
