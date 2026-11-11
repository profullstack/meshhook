/**
 * GET /.well-known/logicsrc-grant/<nonce> — the manifest logicsrc fetches from
 * this origin over TLS (@profullstack/key-grants).
 */
import { keyGrants } from '@meshhook/shared/lib/logicsrc-grants.js';

export const GET = ({ params }) => keyGrants().manifestResponse(params.nonce);
