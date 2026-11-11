/**
 * POST /api/hooks/<project id>/<workflow slug> — webhook ingest, scoped to a
 * project so two users' workflows with the same name never collide. This is
 * the URL the Webhook node shows.
 */

import { ingestHook } from '$lib/server/hook-ingest.js';

export function POST({ request, params }) {
	return ingestHook(request, { slug: params.slug, projectId: params.project });
}
