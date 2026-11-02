/**
 * The saved workflow, as the engine sees it.
 *
 * The builder stores SvelteFlow state: `node.type` is a *render* type
 * ("default", "loopContainer"); the node's real kind lives in `node.data.type`
 * and its settings in `node.data.config`. Nodes dropped inside a loop container
 * carry `parentId` and run as that loop's body, not as part of the top-level
 * DAG.
 */

/** Kinds that start a run. Their output is the trigger payload. */
export const TRIGGER_KINDS = new Set(['webhook', 'schedule', 'manual']);

/**
 * Kinds that choose an outgoing edge instead of firing all of them.
 * (`branch` is the builder's fan-out, "split flow to multiple paths": it
 * fires every edge, so it is not here.)
 */
export const BRANCH_KINDS = new Set(['conditional']);

/** The node's real kind, whichever shape it was saved in. */
export function kindOf(node) {
	const kind = node?.data?.type ?? node?.type;
	// Older engine-side definitions used snake_case.
	if (kind === 'http_call') return 'httpCall';
	if (kind === 'loopContainer') return 'loop';
	return kind;
}

export function configOf(node) {
	return node?.data?.config ?? node?.config ?? {};
}

/** Parse a stored definition (TEXT column) into a graph with adjacency. */
export function buildGraph(definition) {
	const def = typeof definition === 'string' ? JSON.parse(definition || '{}') : definition ?? {};
	const allNodes = Array.isArray(def.nodes) ? def.nodes : [];
	const allEdges = Array.isArray(def.edges) ? def.edges : [];

	const byId = new Map(allNodes.map((n) => [n.id, n]));
	const childOf = (n) => n.parentId ?? n.data?.parentContainer ?? null;

	// Top level: nodes not inside a container, and edges between them.
	const nodes = allNodes.filter((n) => !childOf(n));
	const topIds = new Set(nodes.map((n) => n.id));
	const edges = allEdges.filter((e) => topIds.has(e.source) && topIds.has(e.target));

	// A cycle would leave every node waiting on another forever: reject it here
	// so the run fails with a reason instead of sitting in "running".
	topoSort(nodes, edges);

	const incoming = new Map(nodes.map((n) => [n.id, []]));
	const outgoing = new Map(nodes.map((n) => [n.id, []]));
	for (const e of edges) {
		incoming.get(e.target).push(e);
		outgoing.get(e.source).push(e);
	}

	/** Body of a loop container, in execution order. */
	function loopBody(loopId) {
		const kids = allNodes.filter((n) => childOf(n) === loopId);
		const ids = new Set(kids.map((n) => n.id));
		const inner = allEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
		return topoSort(kids, inner);
	}

	return {
		def,
		settings: def.settings ?? {},
		nodes,
		edges,
		byId,
		incoming,
		outgoing,
		loopBody,
		roots: nodes.filter((n) => incoming.get(n.id).length === 0)
	};
}

/** Kahn's algorithm; ties keep definition order so runs are deterministic. */
export function topoSort(nodes, edges) {
	const indeg = new Map(nodes.map((n) => [n.id, 0]));
	for (const e of edges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
	const order = [];
	const queue = nodes.filter((n) => indeg.get(n.id) === 0);
	const byId = new Map(nodes.map((n) => [n.id, n]));
	while (queue.length) {
		const n = queue.shift();
		order.push(n);
		for (const e of edges.filter((x) => x.source === n.id)) {
			indeg.set(e.target, indeg.get(e.target) - 1);
			if (indeg.get(e.target) === 0) queue.push(byId.get(e.target));
		}
	}
	if (order.length !== nodes.length) throw new Error('Workflow has a cycle');
	return order;
}
