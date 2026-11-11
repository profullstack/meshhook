/**
 * CoinPay OAuth 2.1 for MeshHook: "Sign in with CoinPay" and "Connect CoinPay"
 * (a merchant-scoped token the CoinPay plugin uses instead of a pasted key).
 *
 * The client id/secret live in the logicsrc vault meshhook--prod
 * (COINPAY_OAUTH_CLIENT_ID / COINPAY_OAUTH_CLIENT_SECRET) and reach app.env on
 * deploy; logicsrc is the master copy.
 *
 * Identity rule (fleet STANDING): a CoinPay account binds to its `sub`, never
 * to the email CoinPay reports; CoinPay never verifies emails.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const COINPAY_BASE = (process.env.COINPAY_OAUTH_BASE ?? "https://coinpayportal.com").replace(/\/$/, "");
export const CALLBACK_PATH = "/api/v1/coinpay/oauth/callback";
export const CONNECT_SECRET = "COINPAY_CONNECT";
export const LOGIN_SCOPE = "openid profile email";
export const CONNECT_SCOPE = "openid profile email merchant";

export function oauthConfig(env = process.env) {
  const clientId = env.COINPAY_OAUTH_CLIENT_ID;
  const clientSecret = env.COINPAY_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: `${(env.ORIGIN ?? "https://meshhook.com").replace(/\/$/, "")}${CALLBACK_PATH}` };
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

/** PKCE S256 pair plus state and nonce. */
export function newAuthRequest() {
  const verifier = b64url(randomBytes(32));
  return {
    verifier,
    challenge: b64url(createHash("sha256").update(verifier).digest()),
    state: b64url(randomBytes(16)),
    nonce: b64url(randomBytes(16)),
  };
}

export function authorizeUrl(cfg, { state, challenge, nonce, scope }) {
  const u = new URL(`${COINPAY_BASE}/api/oauth/authorize`);
  u.search = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return u.toString();
}

export class CoinpayOAuthError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "CoinpayOAuthError";
    this.status = status;
    this.code = code;
  }
}

async function tokenRequest(cfg, params, fetchImpl = fetch) {
  const res = await fetchImpl(`${COINPAY_BASE}/api/oauth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      // client_secret_basic: id and secret form-encoded, then base64 (RFC 6749 2.3.1)
      authorization: `Basic ${Buffer.from(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`).toString("base64")}`,
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new CoinpayOAuthError(`CoinPay token endpoint: ${body.error_description ?? body.error ?? `HTTP ${res.status}`}`, {
      status: res.status,
      code: body.error,
    });
  }
  return body;
}

export function exchangeCode(cfg, { code, verifier }, fetchImpl) {
  return tokenRequest(cfg, { grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri, code_verifier: verifier }, fetchImpl);
}

export function refreshTokens(cfg, refreshToken, fetchImpl) {
  return tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: refreshToken }, fetchImpl);
}

export async function userinfo(accessToken, fetchImpl = fetch) {
  const res = await fetchImpl(`${COINPAY_BASE}/api/oauth/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.sub) throw new CoinpayOAuthError(`CoinPay userinfo: HTTP ${res.status}`, { status: res.status });
  return body;
}

/** What gets sealed into the COINPAY_CONNECT secret. */
export function tokenRecord(tokens, now = Date.now()) {
  return {
    type: "oauth",
    provider: "coinpay",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    scope: tokens.scope ?? CONNECT_SCOPE,
    expires_at: new Date(now + (Number(tokens.expires_in) || 3600) * 1000).toISOString(),
  };
}

export function parseTokenRecord(value) {
  if (typeof value !== "string" || !value.startsWith("{")) return null;
  try {
    const rec = JSON.parse(value);
    return rec?.type === "oauth" && rec.provider === "coinpay" && rec.access_token ? rec : null;
  } catch {
    return null;
  }
}

export const needsRefresh = (rec, now = Date.now(), skewMs = 120_000) => Date.parse(rec.expires_at) - skewMs <= now;

// ---- identities: CoinPay sub -> MeshHook user ----

let ensured = null;
export function ensureIdentityTable(db) {
  ensured ??= db
    .none(
      `create table if not exists user_identities (
         provider text not null,
         subject text not null,
         user_id text not null,
         created_at text not null default (CURRENT_TIMESTAMP),
         primary key (provider, subject)
       )`,
    )
    .catch((e) => {
      ensured = null;
      throw e;
    });
  return ensured;
}

export async function userForSub(db, sub) {
  await ensureIdentityTable(db);
  const row = await db.oneOrNone("select user_id from user_identities where provider = 'coinpay' and subject = ?", [sub]);
  return row?.user_id ?? null;
}

/** Link a sub to a signed-in user. Refuses a sub already linked to someone else. */
export async function linkSub(db, sub, userId) {
  const owner = await userForSub(db, sub);
  if (owner && owner !== userId) {
    throw new CoinpayOAuthError("That CoinPay account is already linked to another MeshHook account.", { status: 409 });
  }
  if (!owner) await db.none("insert into user_identities (provider, subject, user_id) values ('coinpay', ?, ?)", [sub, userId]);
}

/** Placeholder login email for an account created by CoinPay sign-in (never the CoinPay email). */
export const placeholderEmail = (sub) => `coinpay-${String(sub).replace(/[^A-Za-z0-9_-]/g, "")}@users.meshhook.com`;

// ---- webhooks ----

/** X-CoinPay-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "t.body">, 5 minute tolerance. */
export function verifyCoinpaySignature(rawBody, header, secret, { now = Date.now(), tolerance = 300 } = {}) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    String(header)
      .split(",")
      .map((p) => p.split("=").map((s) => s.trim()))
      .filter((kv) => kv.length === 2),
  );
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(Math.floor(now / 1000) - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(parts.v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
