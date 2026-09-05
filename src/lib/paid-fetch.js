/**
 * The fetch the HTTP node calls out with — paying when asked.
 *
 * A URL behind an x402 gateway answers with 402 and an offer. With
 * `X402_PRIVATE_KEY` set on the orchestrator, the client signs the offer with
 * the shared crawler wallet, buys the pass, files it by origin and presents
 * it on every later call to that site. Without the key this is the global
 * fetch, unchanged. Capped at five dollars a payment.
 */

import { createClient } from '@profullstack/x402-client';

const key = globalThis.process?.env?.X402_PRIVATE_KEY;

/** The paying client, or null when no key is configured. */
export const x402 = key ? createClient({ key, maxUsd: 5 }) : null;

/** @type {typeof fetch} */
export const paidFetch = x402 ? (input, init) => x402.fetch(input, init) : (input, init) => globalThis.fetch(input, init);
