/**
 * POST /api/hooks/[slug] — webhook ingest.
 *
 * Creates a run for the workflow and enqueues it for the orchestrator.
 *
 * Three fixes came with the Turso port:
 *  - `$2::jsonb` is not valid SQLite; the payload column is TEXT.
 *  - It imported `enqueueRun` from @meshhook/shared/lib/queue.js, which never
 *    exported that name — the in-process EventEmitter version lives in
 *    workers/lib/queue.js and only reaches workers inside the same process.
 *    The job now goes onto the real workflow_jobs queue, so a separately
 *    deployed orchestrator actually receives it.
 *  - The signature comparison used `!==`, which leaks the position of the first
 *    differing byte through timing. It is now constant-time.
 */

import { ingestHook } from '$lib/server/hook-ingest.js';

export function POST({ request, params }) {
	return ingestHook(request, { slug: params.slug });
}
