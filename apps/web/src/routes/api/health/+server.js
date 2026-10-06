/**
 * GET /api/health — public liveness + database check for status.profullstack.com.
 *
 * One `select 1` through the shared client with a 3s ceiling. No auth, no
 * error details: 200 {"status":"ok","db":"ok"} or 503 {"status":"error","db":"down"}.
 */

import { json } from '@sveltejs/kit';
import { getClient } from '@meshhook/shared/lib/db.js';

const DB_TIMEOUT_MS = 3000;
const headers = { 'cache-control': 'no-store' };

export async function GET() {
	let timer;
	try {
		await Promise.race([
			getClient().execute('select 1'),
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS);
			})
		]);
		return json({ status: 'ok', db: 'ok' }, { headers });
	} catch {
		return json({ status: 'error', db: 'down' }, { status: 503, headers });
	} finally {
		clearTimeout(timer);
	}
}
