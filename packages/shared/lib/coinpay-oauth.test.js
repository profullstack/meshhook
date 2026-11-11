import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import {
  authorizeUrl, linkSub, needsRefresh, newAuthRequest, parseTokenRecord, placeholderEmail,
  tokenRecord, userForSub, verifyCoinpaySignature,
} from "./coinpay-oauth.js";
import { createVault, openUserSecret, sealUserSecret, userSealer } from "./vault.js";
import { ReconnectError, _resetUserSessions, freshAccessToken } from "./user-keys.js";

function fakeDb() {
  const ids = [];
  const vaults = new Map();
  const secrets = new Map();
  return {
    ids, secrets,
    none: async (q, p = []) => {
      if (/^insert into user_identities/.test(q)) ids.push({ subject: p[0], user_id: p[1] });
      if (/^insert into key_vaults/i.test(q.trim())) vaults.set(p[0], { seal: p[1], operator_secrets: null });
      if (/^update secrets set value_encrypted/.test(q)) secrets.set(`${p[1]}:${p[2]}`, p[0]);
    },
    oneOrNone: async (q, p = []) => {
      if (/from user_identities/.test(q)) { const r = ids.find((i) => i.subject === p[0]); return r ? { user_id: r.user_id } : null; }
      return vaults.get(p[0]) ?? null;
    },
  };
}

describe("CoinPay OAuth basics", () => {
  it("PKCE S256 and an authorize URL with every required parameter", () => {
    const r = newAuthRequest();
    expect(r.challenge).toBe(createHash("sha256").update(r.verifier).digest("base64url"));
    const u = new URL(authorizeUrl({ clientId: "cp_x", redirectUri: "https://meshhook.com/api/v1/coinpay/oauth/callback" }, { ...r, scope: "openid merchant" }));
    expect(u.origin + u.pathname).toBe("https://coinpayportal.com/api/oauth/authorize");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ response_type: "code", client_id: "cp_x", code_challenge_method: "S256", scope: "openid merchant", state: r.state, nonce: r.nonce });
  });

  it("verifies X-CoinPay-Signature (t=,v1=) with a 5 minute window", () => {
    const body = '{"type":"payment.confirmed"}';
    const t = 1_800_000_000;
    const sig = `t=${t},v1=${createHmac("sha256", "whsec_fixture").update(`${t}.${body}`).digest("hex")}`;
    expect(verifyCoinpaySignature(body, sig, "whsec_fixture", { now: t * 1000 })).toBe(true);
    expect(verifyCoinpaySignature(body + " ", sig, "whsec_fixture", { now: t * 1000 })).toBe(false);
    expect(verifyCoinpaySignature(body, sig, "whsec_fixture", { now: (t + 301) * 1000 })).toBe(false);
    expect(verifyCoinpaySignature(body, null, "whsec_fixture")).toBe(false);
  });

  it("token records round-trip and know when to refresh", () => {
    const rec = tokenRecord({ access_token: "a", refresh_token: "r", expires_in: 3600 }, 0);
    expect(parseTokenRecord(JSON.stringify(rec))).toEqual(rec);
    expect(parseTokenRecord("cp_live_plainkey")).toBeNull();
    expect(needsRefresh(rec, 0)).toBe(false);
    expect(needsRefresh(rec, 3_500_000)).toBe(true);
  });

  it("binds by sub only and refuses a sub owned by someone else", async () => {
    const db = fakeDb();
    await linkSub(db, "sub-1", "user-a");
    await linkSub(db, "sub-1", "user-a");
    expect(db.ids).toHaveLength(1);
    expect(await userForSub(db, "sub-1")).toBe("user-a");
    await expect(linkSub(db, "sub-1", "user-b")).rejects.toMatchObject({ status: 409 });
    expect(placeholderEmail("ab/c@d")).toBe("coinpay-abcd@users.meshhook.com");
  });
});

describe("connected token refresh", () => {
  const env = { ...process.env };
  beforeEach(() => Object.assign(process.env, { COINPAY_OAUTH_CLIENT_ID: "cp_test", COINPAY_OAUTH_CLIENT_SECRET: "fixture", ORIGIN: "https://meshhook.com" }));
  afterEach(() => { process.env = { ...env }; _resetUserSessions(); });

  it("a live token is used as is", async () => {
    const rec = tokenRecord({ access_token: "live", refresh_token: "r" });
    expect(await freshAccessToken(fakeDb(), "p", "u", "COINPAY_CONNECT", rec)).toBe("live");
  });

  it("an expiring token is refreshed once, re-sealed to the owner's vault, and saved", async () => {
    const db = fakeDb();
    const made = await userSealer.createSeal("correct horse battery staple", "u");
    await createVault(db, "u", made.seal);
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, body: String(init.body), auth: init.headers.authorization });
      return new Response(JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }), { status: 200 });
    };
    const rec = tokenRecord({ access_token: "old", refresh_token: "old-refresh", expires_in: 1 }, 0);
    const [a, b] = await Promise.all([
      freshAccessToken(db, "p", "u", "COINPAY_CONNECT", rec, { fetchImpl }),
      freshAccessToken(db, "p", "u", "COINPAY_CONNECT", rec, { fetchImpl }),
    ]);
    expect([a, b]).toEqual(["new-access", "new-access"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://coinpayportal.com/api/oauth/token");
    expect(calls[0].body).toContain("grant_type=refresh_token");
    expect(calls[0].auth).toMatch(/^Basic /);
    const stored = db.secrets.get("p:COINPAY_CONNECT");
    const opened = await openUserSecret(made.dek, made.seal, "u", stored);
    expect(parseTokenRecord(opened.COINPAY_CONNECT)).toMatchObject({ access_token: "new-access", refresh_token: "new-refresh" });
  });

  it("a refused refresh asks the user to reconnect", async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    const rec = tokenRecord({ access_token: "old", refresh_token: "used", expires_in: 1 }, 0);
    await expect(freshAccessToken(fakeDb(), "p", "u", "COINPAY_CONNECT", rec, { fetchImpl })).rejects.toBeInstanceOf(ReconnectError);
  });
});
