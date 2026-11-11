/**
 * GET /api/v1/logicsrc/grant/start?keys=A,B&next=/path — ask logicsrc for keys.
 * Sends the signed-in person to logicsrc's consent page (a plain 303: Kit 3's
 * redirect() refuses other origins).
 */
import { redirect } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';
import { GrantStartError, startGrant } from '@meshhook/shared/lib/logicsrc-grants.js';

export async function GET({ url, locals }) {
	if (!locals.user) throw redirect(303, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	try {
		const location = await startGrant(db, {
			userId: locals.user.id,
			keys: url.searchParams.get('keys'),
			next: url.searchParams.get('next'),
			origin: process.env.ORIGIN ?? url.origin
		});
		return new Response(null, { status: 303, headers: { location } });
	} catch (e) {
		if (e instanceof GrantStartError) throw redirect(303, `/secrets?logicsrc=${e.code}`);
		throw e;
	}
}
