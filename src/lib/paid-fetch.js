/**
 * The fetch the HTTP node calls out with — paying when asked.
 *
 * A URL behind an x402 gateway answers with 402 and an offer. With the
 * operator's x402 payer key UNLOCKED in this process, the client signs the
 * offer, buys the pass, files it by origin and presents it on every later
 * call to that site. Capped at five dollars a payment.
 *
 * The key is an operator key under the unlock-on-use rule (2026-10-28): it is
 * sealed in the operator vault and read per call (operatorKey), never at
 * import, never held after a lock. Locked = no payment: the 402 comes back to
 * the workflow as-is and one [alert] line is logged.
 */

import { createClient } from '@profullstack/x402-client';
import { db } from '@meshhook/shared/lib/db.js';
import { operatorKey } from '@meshhook/shared/lib/operator-keys.js';

let cached = null; // { key, client } for the key currently unlocked

/** The paying client for the unlocked key, or null while locked. */
export async function x402Client(getKey = () => operatorKey(db, 'x402', { envName: 'X402_PRIVATE_KEY' })) {
  const key = await getKey();
  if (!key) {
    cached = null;
    return null;
  }
  if (cached?.key !== key) cached = { key, client: createClient({ key, maxUsd: 5 }) };
  return cached.client;
}

/** @type {typeof fetch} */
export async function paidFetch(input, init) {
  const client = await x402Client().catch(() => null);
  return client ? client.fetch(input, init) : globalThis.fetch(input, init);
}
