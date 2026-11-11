/**
 * Keys from logicsrc (the CoinPay <-> logicsrc key hub, phase 2).
 *
 * meshhook asks logicsrc for named keys; the person approves on logicsrc, their
 * browser seals each value to their meshhook key-vault inbox, and logicsrc
 * posts the sealed text to our webhook. We store it exactly like a secret
 * typed on the Secrets page: the server can store it, never open it.
 *
 *   start      a request row (nonce + webhook secret), then 303 to logicsrc /grant
 *   manifest   GET /.well-known/logicsrc-grant/<nonce>: logicsrc fetches it over TLS
 *   webhook    POST /api/v1/logicsrc/webhook (Standard Webhooks signature)
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SEALED_PREFIX, getVault } from "./vault.js";
import { ensureDefaultProject } from "./authz.js";

export const LOGICSRC_URL = (process.env.LOGICSRC_URL ?? "https://app.logicsrc.com").replace(/\/$/, "");
const TTL_MS = 30 * 60_000;
const KEY_NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/;

let ensured = null;
export function ensureGrantTables(db) {
  ensured ??= (async () => {
    await db.none(`create table if not exists logicsrc_grant_requests (
      nonce text primary key,
      user_id text not null,
      project_id text not null,
      keys text not null,
      webhook_secret text not null,
      next_path text not null,
      created_at bigint not null,
      expires_at bigint not null
    )`);
    await db.none(`create table if not exists logicsrc_grants (
      grant_id text primary key,
      nonce text not null,
      user_id text not null,
      project_id text not null,
      key_name text not null,
      status text not null,
      updated_at bigint not null
    )`);
  })().catch((e) => {
    ensured = null;
    throw e;
  });
  return ensured;
}

export class GrantStartError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/** Normalise "A, B" / ["A","B"] into valid, unique key names (max 20). */
export function parseKeyNames(input) {
  const list = (Array.isArray(input) ? input : String(input ?? "").split(/[,\s]+/)).map((s) => String(s).trim()).filter(Boolean);
  const names = [...new Set(list)];
  if (!names.length) throw new GrantStartError("Name at least one key", "no_keys");
  if (names.length > 20) throw new GrantStartError("At most 20 keys per request", "too_many");
  for (const n of names) if (!KEY_NAME.test(n)) throw new GrantStartError(`"${n}" is not a valid key name`, "bad_key");
  return names;
}

const safeNext = (p) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/secrets");

/** Create a request and return the logicsrc URL to send the person to. */
export async function startGrant(db, { userId, keys, next, origin, now = Date.now() }) {
  await ensureGrantTables(db);
  if (!(await getVault(db, userId))) throw new GrantStartError("Create your key vault first: keys from logicsrc are sealed to it.", "needs_vault");
  const names = parseKeyNames(keys);
  const projectId = await ensureDefaultProject(userId, "Default Project", db);
  const nonce = randomBytes(24).toString("base64url");
  await db.none(
    `insert into logicsrc_grant_requests (nonce, user_id, project_id, keys, webhook_secret, next_path, created_at, expires_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nonce, userId, projectId, JSON.stringify(names), randomBytes(32).toString("base64url"), safeNext(next), now, now + TTL_MS],
  );
  const u = new URL(`${LOGICSRC_URL}/grant`);
  u.searchParams.set("origin", origin);
  u.searchParams.set("nonce", nonce);
  return u.toString();
}

/** The manifest logicsrc fetches; null when the nonce is unknown or expired. */
export async function manifestFor(db, nonce, { origin, now = Date.now() }) {
  await ensureGrantTables(db);
  const r = await db.oneOrNone("select * from logicsrc_grant_requests where nonce = ?", [String(nonce ?? "")]);
  if (!r || Number(r.expires_at) <= now) return null;
  const vault = await getVault(db, r.user_id);
  if (!vault) return null;
  const ret = new URL(r.next_path, origin);
  ret.searchParams.set("logicsrc", "granted");
  return {
    v: 1,
    app_name: "MeshHook",
    keys: JSON.parse(r.keys).map((name) => ({ name, description: "Used by your MeshHook workflows; opens only while your vault is unlocked for runs" })),
    recipient: { format: "sealed-secrets/inbox-v2", app: "meshhook", scope: "workflow_secrets", user_id: r.user_id, inbox_public_key: vault.seal.inbox_public_key },
    webhook_url: `${origin}/api/v1/logicsrc/webhook`,
    webhook_secret: r.webhook_secret,
    return_url: ret.toString(),
    expires_at: Number(r.expires_at),
  };
}

/** Standard Webhooks: "v1,<b64>" (space-separated list allowed), HMAC over "<id>.<ts>.<body>", 5 minute window. */
export function verifyWebhook(secret, headers, body, { now = Date.now(), tolerance = 300 } = {}) {
  const id = headers["webhook-id"];
  const ts = Number(headers["webhook-timestamp"]);
  const sigs = String(headers["webhook-signature"] ?? "").split(" ");
  if (!id || !ts || Math.abs(Math.floor(now / 1000) - ts) > tolerance) return false;
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret, "utf8");
  const expected = Buffer.from(`v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`);
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

/**
 * Apply one verified-or-rejected webhook. Returns { status, body } for the route.
 * The request (and its secret) is found by the grant id once known, else among
 * the recipient's own requests: whichever secret verifies the signature wins.
 */
export async function handleWebhook(db, headers, rawBody, { now = Date.now() } = {}) {
  await ensureGrantTables(db);
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "not JSON" } };
  }
  const grantId = String(event.grant_id ?? "");
  if (!grantId || typeof event.key_name !== "string") return { status: 400, body: { error: "grant_id and key_name required" } };

  const known = await db.oneOrNone("select * from logicsrc_grants where grant_id = ?", [grantId]);
  const candidates = known
    ? await db.manyOrNone("select * from logicsrc_grant_requests where nonce = ?", [known.nonce])
    : await db.manyOrNone("select * from logicsrc_grant_requests where user_id = ? order by created_at desc limit 50", [String(event.recipient_user_id ?? "")]);
  const req = candidates.find((r) => verifyWebhook(r.webhook_secret, headers, rawBody, { now }));
  if (!req) return { status: 401, body: { error: "bad signature" } };
  if (!known && !JSON.parse(req.keys).includes(event.key_name)) return { status: 400, body: { error: "we did not ask for that key" } };
  const keyName = known?.key_name ?? event.key_name;

  if (event.type === "grant.revoked") {
    if (known) {
      await db.none("delete from secrets where project_id = ? and key = ?", [known.project_id, known.key_name]);
      await db.none("update logicsrc_grants set status = 'revoked', updated_at = ? where grant_id = ?", [now, grantId]);
    }
    return { status: 200, body: { ok: true } };
  }
  if (event.type !== "grant.delivered" && event.type !== "grant.updated") return { status: 200, body: { ignored: event.type } };
  if (typeof event.sealed !== "string" || !event.sealed.startsWith(SEALED_PREFIX)) return { status: 400, body: { error: "not a sealed value" } };

  await db.none(
    `insert into secrets (project_id, key, value_encrypted) values (?, ?, ?)
     on conflict (project_id, key) do update set value_encrypted = excluded.value_encrypted`,
    [req.project_id, keyName, event.sealed],
  );
  if (known) await db.none("update logicsrc_grants set status = 'active', updated_at = ? where grant_id = ?", [now, grantId]);
  else {
    await db.none(
      "insert into logicsrc_grants (grant_id, nonce, user_id, project_id, key_name, status, updated_at) values (?, ?, ?, ?, ?, 'active', ?)",
      [grantId, req.nonce, req.user_id, req.project_id, keyName, now],
    );
  }
  return { status: 200, body: { ok: true, key: keyName } };
}
