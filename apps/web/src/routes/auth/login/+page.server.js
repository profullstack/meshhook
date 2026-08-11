/**
 * Login and signup form actions.
 *
 * Supabase Auth ran in the browser: the page held an anon-key client and called
 * signInWithPassword / signUp directly, and the SDK managed the cookie. The
 * session is now a row in Turso, so authentication happens on the server and
 * the browser only ever receives an httpOnly cookie.
 *
 * A consequence worth noting: signUp used to send a confirmation email via
 * Supabase. There is no mail provider here, so accounts are usable immediately
 * and users.email_verified stays 0. Wiring up verification is issue #47.
 */

import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
	authenticate,
	createUser,
	createSession,
	SESSION_COOKIE,
	sessionCookieOptions
} from '@meshhook/shared/lib/auth.js';
import { ensureDefaultProject } from '@meshhook/shared/lib/authz.js';

/** Only allow same-site relative paths, so `next` cannot be an open redirect. */
function safeNext(next) {
	if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) {
		return '/workflows';
	}
	return next;
}

/** Issue the session and set the cookie. */
async function startSession(event, userId) {
	const { token } = await createSession(userId, {
		userAgent: event.request.headers.get('user-agent'),
		ipAddress: event.getClientAddress()
	});

	event.cookies.set(SESSION_COOKIE, token, sessionCookieOptions({ secure: !dev }));
}

export async function load(event) {
	// Already signed in — no reason to show the form.
	if (event.locals.user) {
		throw redirect(303, safeNext(event.url.searchParams.get('next')));
	}
	return {};
}

export const actions = {
	login: async (event) => {
		const data = await event.request.formData();
		const email = data.get('email');
		const password = data.get('password');
		const next = safeNext(data.get('next'));

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.', email });
		}

		const user = await authenticate({ email, password });

		if (!user) {
			// One message for both unknown-email and wrong-password, so the form
			// cannot be used to enumerate registered addresses.
			return fail(400, { error: 'Invalid email or password.', email });
		}

		await startSession(event, user.id);
		throw redirect(303, next);
	},

	signup: async (event) => {
		const data = await event.request.formData();
		const email = data.get('email');
		const password = data.get('password');
		const next = safeNext(data.get('next'));

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.', email });
		}

		let user;
		try {
			user = await createUser({ email, password });
		} catch (error) {
			return fail(400, { error: error.message, email });
		}

		// Supabase seeded a project with a trigger on auth.users; do it here.
		await ensureDefaultProject(user.id, 'Default');

		await startSession(event, user.id);
		throw redirect(303, next);
	}
};
