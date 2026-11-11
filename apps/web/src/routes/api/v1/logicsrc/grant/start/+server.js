/**
 * GET /api/v1/logicsrc/grant/start?keys=A,B&next=/path — ask logicsrc for keys
 * (@profullstack/key-grants). A refusal comes back as /secrets?logicsrc=<code>.
 */
import { redirect } from '@sveltejs/kit';
import { startResponse } from '@meshhook/shared/lib/logicsrc-grants.js';

export async function GET({ url, locals }) {
	if (!locals.user) throw redirect(303, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	return startResponse({ userId: locals.user.id, keys: url.searchParams.get('keys'), next: url.searchParams.get('next') });
}
