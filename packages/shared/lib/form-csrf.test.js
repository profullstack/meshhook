import { describe, expect, it } from 'vitest';
import { formCsrf } from './form-csrf.js';

const req = (path, { origin, type = 'application/x-www-form-urlencoded', method = 'POST' } = {}) => [
	new Request(`https://meshhook.com${path}`, { method, headers: { 'content-type': type, ...(origin ? { origin } : {}) }, body: 'a=1' }),
	new URL(`https://meshhook.com${path}`)
];

describe('form CSRF', () => {
	it('lets any sender form-POST a webhook', () => {
		expect(formCsrf(...req('/api/hooks/p/slug'))).toBeNull();
		expect(formCsrf(...req('/api/hooks/slug', { origin: 'https://slack.com' }))).toBeNull();
	});
	it('still refuses cross-site form posts everywhere else', () => {
		expect(formCsrf(...req('/auth/login?/login', { origin: 'https://evil.test' }))?.status).toBe(403);
		expect(formCsrf(...req('/auth/login?/login'))?.status).toBe(403);
		expect(formCsrf(...req('/auth/login?/login', { origin: 'https://meshhook.com' }))).toBeNull();
		expect(formCsrf(...req('/api/workflows', { origin: 'https://evil.test', type: 'application/json' }))).toBeNull();
	});
});
