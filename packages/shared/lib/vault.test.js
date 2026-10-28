import { afterEach, describe, expect, it } from "vitest";
import { bytesToBase64, UnlockStore } from "@profullstack/sealed-secrets";
import { OPERATOR, SEALED_PREFIX, createVault, openUserSecret, operatorSealer, sealUserSecret, userSealer } from "./vault.js";
import { ALERT_LINE, _reset, operatorKey, operatorSessions, startOperatorControl } from "./operator-keys.js";

/** In-memory stand-in for the key_vaults table over the db.* API. */
function fakeDb() {
  const rows = new Map();
  return {
    rows,
    none: async (q, p = []) => {
      if (/^create table/i.test(q.trim())) return;
      if (/^insert into key_vaults/i.test(q.trim())) rows.set(p[0], { seal: p[1], operator_secrets: null });
      if (/^update key_vaults set operator_secrets/i.test(q.trim())) rows.get(p[1]).operator_secrets = p[0];
    },
    oneOrNone: async (_q, p = []) => rows.get(p[0]) ?? null,
  };
}

const USER = "user-1";
afterEach(() => _reset());

describe("workflow secrets: sealed to the owner's vault", () => {
  it("no vault = refuse to store a secret (409), never plaintext", async () => {
    await expect(sealUserSecret(fakeDb(), USER, "API_TOKEN", "s3cr3t")).rejects.toMatchObject({ status: 409 });
  });

  it("the server seals, cannot open; the owner's data key opens", async () => {
    const db = fakeDb();
    const made = await userSealer.createSeal("correct horse battery staple", USER);
    await createVault(db, USER, made.seal);
    const stored = await sealUserSecret(db, USER, "API_TOKEN", "s3cr3t-value");
    expect(stored.startsWith(SEALED_PREFIX)).toBe(true);
    expect(stored).not.toContain("s3cr3t-value");
    expect(await openUserSecret(made.dek, made.seal, USER, stored)).toEqual({ API_TOKEN: "s3cr3t-value" });
    await expect(openUserSecret(made.dek, made.seal, "user-2", stored)).rejects.toThrow();
  });
});

describe("operator x402 key: unlock-on-use", () => {
  const ENV = { X402_PRIVATE_KEY: "0xplaintext-env-key" };

  it("before sealing, the env copy is honoured with a warning; LEGACY_KEY_MIGRATION=off refuses it", async () => {
    const logs = [];
    _reset();
    expect(await operatorKey(fakeDb(), "x402", { envName: "X402_PRIVATE_KEY", env: ENV, log: (l) => logs.push(l) })).toBe(ENV.X402_PRIVATE_KEY);
    expect(logs[0]).toContain("still plaintext");
    expect(await operatorKey(fakeDb(), "x402", { envName: "X402_PRIVATE_KEY", env: { ...ENV, LEGACY_KEY_MIGRATION: "off" }, log: (l) => logs.push(l) })).toBeNull();
    expect(logs).toContain(ALERT_LINE);
  });

  it("once sealed: env is ignored, locked = null + one alert, unlock opens, TTL and lock close", async () => {
    let now = 1_000_000;
    _reset(new UnlockStore({ now: () => now, useTimers: false }));
    const db = fakeDb();
    const made = await operatorSealer.createSeal("operator passphrase!!", OPERATOR);
    await createVault(db, OPERATOR, made.seal);
    const blob = await operatorSealer.sealSecrets(made.dek, { x402: "0xsealed-key" }, OPERATOR);
    await db.none("update key_vaults set operator_secrets = ? where owner = ?", [JSON.stringify(blob), OPERATOR]);

    const logs = [];
    const get = () => operatorKey(db, "x402", { envName: "X402_PRIVATE_KEY", env: ENV, log: (l) => logs.push(l) });
    expect(await get()).toBeNull(); // a restart: locked, env NOT used
    expect(await get()).toBeNull();
    expect(logs.filter((l) => l === ALERT_LINE)).toHaveLength(1); // once per lock

    const srv = startOperatorControl({ db, token: "tok", port: 0, log: () => {} });
    try {
      const post = (path, body, token = "tok") =>
        fetch(`http://127.0.0.1:${srv.port}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-operator-control-token": token }, body: JSON.stringify(body) });
      expect((await post("/unlock", { data_key: bytesToBase64(made.dek) }, "wrong")).status).toBe(403);
      expect((await post("/unlock", { data_key: bytesToBase64(new Uint8Array(32)) })).status).toBe(403); // wrong key
      const ok = await post("/unlock", { data_key: bytesToBase64(made.dek) });
      expect(ok.status).toBe(200);
      expect(new Date((await ok.json()).expiresAt).getTime()).toBe(now + 7 * 86400_000); // operator default 7d
      expect(await get()).toBe("0xsealed-key");
      now += 7 * 86400_000 + 1;
      expect(await get()).toBeNull();
      await post("/unlock", { data_key: bytesToBase64(made.dek), ttl: "1h" });
      expect(operatorSessions.status(OPERATOR).unlocked).toBe(true);
      await post("/lock", {});
      expect(await get()).toBeNull();
    } finally {
      srv.stop(true);
    }
  });
});
