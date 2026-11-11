/**
 * GET /.well-known/logicsrc-grant/<nonce> — the grant manifest logicsrc fetches
 * from this origin over TLS (that fetch is how logicsrc knows it is us).
 */
import { json } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';
import { manifestFor } from '@meshhook/shared/lib/logicsrc-grants.js';

export async function GET({ params, url }) {
	const m = await manifestFor(db, params.nonce, { origin: process.env.ORIGIN ?? url.origin });
	if (!m) return json({ error: 'unknown or expired request' }, { status: 404 });
	return json(m, { headers: { 'cache-control': 'no-store' } });
}
