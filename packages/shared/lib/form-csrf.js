/**
 * Cross-site form-submission guard for the web app (see apps/web/vite.config.js:
 * Kit's own check is off so webhook senders can form-POST /api/hooks/*).
 */

const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

/**
 * SvelteKit's cross-site form-submission guard, minus the webhook ingest.
 * Returns a 403 Response for a cross-origin form POST to anything but
 * /api/hooks/*, else null.
 */
export function formCsrf(request, url) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return null;
  if (url.pathname.startsWith('/api/hooks/')) return null;
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!FORM_TYPES.includes(type)) return null;
  if (request.headers.get('origin') === url.origin) return null;
  return new Response('Cross-site POST form submissions are forbidden', { status: 403 });
}
