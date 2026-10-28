import { describe, expect, test } from 'bun:test';
import { x402Client } from './paid-fetch.js';

describe('paid fetch: no key held at import, none while locked', () => {
  test('locked: no paying client', async () => {
    expect(await x402Client(async () => null)).toBeNull();
  });
  test('unlocked: a client for that key, reused until the key changes', async () => {
    const k = '0x' + '11'.repeat(32);
    const a = await x402Client(async () => k);
    expect(a).not.toBeNull();
    expect(await x402Client(async () => k)).toBe(a);
    expect(await x402Client(async () => null)).toBeNull();
  });
});
