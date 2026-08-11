/**
 * GET /api/runs/[id]/events — stream a run's events as Server-Sent Events.
 *
 * Supabase Realtime replicated Postgres INSERTs to the browser over a
 * websocket. Turso has no equivalent, so the server polls workflow_events for
 * rows newer than the last id it sent and pushes them down an SSE stream.
 *
 * Polling rather than websockets is a deliberate trade: events are append-only
 * with a monotonic integer id, so "give me everything after N" is an index
 * lookup, and SSE reconnects on its own with Last-Event-ID. A client that drops
 * out and returns resumes exactly where it left off instead of re-reading the
 * whole history.
 *
 * The stream terminates once the run reaches a terminal state and its backlog
 * has been flushed, so an open tab does not poll a finished run indefinitely.
 */

import { error } from '@sveltejs/kit';
import { getRun, listRunEvents } from '@meshhook/shared/lib/authz.js';

const POLL_INTERVAL_MS = 1000;

/** Runs in these states will never emit another event. */
const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

export async function GET(event) {
	const user = event.locals.user;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = event.params;

	// Authorise once, up front — the stream reuses this decision.
	const run = await getRun(user.id, id);
	if (!run) {
		throw error(404, 'Run not found');
	}

	// Resume point: the header wins on reconnect, the query param seeds a fresh
	// stream that already rendered some history.
	const lastEventId = Number(
		event.request.headers.get('last-event-id') ?? event.url.searchParams.get('after') ?? 0,
	);

	let afterId = Number.isFinite(lastEventId) && lastEventId > 0 ? lastEventId : 0;
	let closed = false;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const send = (payload, { id: eventId, type = 'message' } = {}) => {
				if (closed) return;
				const lines = [];
				if (eventId !== undefined) lines.push(`id: ${eventId}`);
				lines.push(`event: ${type}`);
				lines.push(`data: ${JSON.stringify(payload)}`);
				controller.enqueue(encoder.encode(lines.join('\n') + '\n\n'));
			};

			// Tell the client how long to wait before reconnecting.
			controller.enqueue(encoder.encode(`retry: ${POLL_INTERVAL_MS * 2}\n\n`));

			try {
				while (!closed) {
					const events = await listRunEvents(user.id, id, { afterId, limit: 200 });

					for (const row of events) {
						send(row, { id: row.id, type: 'run_event' });
						afterId = row.id;
					}

					const current = await getRun(user.id, id);

					// Only stop once the backlog is drained, so the last events of a
					// run that finished mid-poll are still delivered.
					if (!current || (TERMINAL.has(current.status) && events.length === 0)) {
						send({ status: current?.status ?? 'unknown' }, { type: 'done' });
						break;
					}

					// A comment line keeps proxies from timing the connection out.
					if (events.length === 0) {
						controller.enqueue(encoder.encode(': keep-alive\n\n'));
					}

					await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				}
			} catch (err) {
				// An aborted request is the normal way this ends, not a fault.
				if (!closed) {
					console.error('Error streaming run events:', err);
				}
			} finally {
				if (!closed) {
					closed = true;
					try {
						controller.close();
					} catch {
						/* already closed */
					}
				}
			}
		},

		cancel() {
			closed = true;
		},
	});

	// Stop polling as soon as the client disconnects.
	event.request.signal?.addEventListener('abort', () => {
		closed = true;
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			// Disable proxy buffering, which would otherwise defeat streaming.
			'X-Accel-Buffering': 'no',
		},
	});
}
