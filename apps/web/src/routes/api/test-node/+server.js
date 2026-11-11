/**
 * POST /api/test-node { node, input?, nodes?, project_id? } — run one node
 * through the workflow engine for the builder's test button. It runs inside
 * the orchestrator (loopback control channel), which is where an unlocked
 * vault's key lives, so plugin and {{$secrets}} steps test exactly as they run.
 */

import { json } from '@sveltejs/kit';
import { CONTROL_PORT, readControlToken } from '@meshhook/shared/lib/operator-keys.js';
import { assertProjectAccess, ensureDefaultProject } from '@meshhook/shared/lib/authz.js';

export async function POST({ locals, request }) {
	if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (!body?.node) return json({ success: false, error: 'node required' }, { status: 400 });

	let projectId;
	try {
		projectId = body.project_id
			? await assertProjectAccess(locals.user.id, body.project_id)
			: await ensureDefaultProject(locals.user.id, 'Default Project');
	} catch (e) {
		return json({ success: false, error: e.message }, { status: e.status ?? 500 });
	}
	if (typeof projectId === 'object') projectId = projectId?.id;

	const token = readControlToken();
	if (!token) return json({ success: false, error: 'The workflow runner is not reachable on this server.' }, { status: 503 });
	try {
		const res = await fetch(`http://127.0.0.1:${CONTROL_PORT}/user-test-node`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-operator-control-token': token },
			body: JSON.stringify({ user_id: locals.user.id, project_id: projectId, node: body.node, input: body.input ?? {}, nodes: body.nodes ?? {} }),
			signal: AbortSignal.timeout(130_000)
		});
		return json(await res.json().catch(() => ({ success: false, error: `runner answered ${res.status}` })), { status: res.status });
	} catch {
		return json({ success: false, error: 'The workflow runner is restarting; try again in a moment.' }, { status: 503 });
	}
}
