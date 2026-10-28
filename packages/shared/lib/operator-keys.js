/**
 * Operator keys (ours, not a user's) under the same rule: sealed at rest,
 * opened only while an operator has unlocked this process.
 *
 * The orchestrator runs a loopback control server (127.0.0.1, token minted
 * by server.mjs per container start and written to a 0600 file). The
 * operator CLI (scripts/operator-vault.mjs, run with `docker exec -it`)
 * derives the vault data key from the passphrase and hands only that key to
 * the control server; it stays in memory for the TTL (default 7d). Restart,
 * TTL or Lock: paid calls stop paying (they get the 402 back) and one
 * "[alert] meshhook.com: operator keys locked, unlock to resume" line is
 * logged per lock for the uptime/alert path.
 */

import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base64ToBytes, parseTtl, UnlockStore, wipe } from "@profullstack/sealed-secrets";
import { OPERATOR, getVault, legacyKeyMigrationEnabled, operatorSealer } from "./vault.js";

export const OPERATOR_TTL_SECONDS = 7 * 24 * 3600;
export const CONTROL_TOKEN_FILE = process.env.OPERATOR_CONTROL_TOKEN_FILE ?? join(tmpdir(), "meshhook-operator-control.token");
export const CONTROL_PORT = Number(process.env.OPERATOR_CONTROL_PORT ?? 8792);
export const ALERT_LINE = "[alert] meshhook.com: operator keys locked, unlock to resume";

export let operatorSessions = new UnlockStore();
let alerted = false;
let warnedPlaintext = false;
export function _reset(store = new UnlockStore({ useTimers: false })) {
  operatorSessions = store;
  alerted = false;
  warnedPlaintext = false;
}

function alertOnce(log) {
  if (alerted) return;
  alerted = true;
  log(ALERT_LINE);
}

/**
 * The operator key `name` (e.g. "x402"), or null while locked.
 *
 * Transition: until an operator has sealed the key into the vault, the old
 * plaintext env copy is still honoured (it is how the key was deployed), with
 * a warning, unless LEGACY_KEY_MIGRATION=off. Once a sealed copy exists the
 * env copy is never read.
 */
export async function operatorKey(db, name, { envName, env = process.env, log = console.log } = {}) {
  const vault = await getVault(db, OPERATOR).catch(() => null);
  const sealed = vault?.operatorSecrets;
  if (!sealed) {
    if (envName && env[envName] && legacyKeyMigrationEnabled(env)) {
      if (!warnedPlaintext) {
        warnedPlaintext = true;
        log(`[alert] meshhook.com: ${envName} is still plaintext in app.env; seal it with scripts/operator-vault.mjs and remove it`);
      }
      return env[envName];
    }
    alertOnce(log);
    return null;
  }
  const dek = operatorSessions.get(OPERATOR);
  if (!dek) {
    alertOnce(log);
    return null;
  }
  const secrets = await operatorSealer.unsealSecrets(dek, sealed, OPERATOR);
  alerted = false;
  return secrets[name] ?? null;
}

const ttlOf = (v) => (typeof v === "number" ? v : typeof v === "string" && v ? parseTtl(v) : OPERATOR_TTL_SECONDS);

function tokenOk(given, expected) {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected ?? "");
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function readControlToken(file = CONTROL_TOKEN_FILE) {
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return process.env.OPERATOR_CONTROL_TOKEN ?? null;
  }
}

/** The orchestrator's loopback control server. Bodies are never logged. */
export function startOperatorControl({ db, token = process.env.OPERATOR_CONTROL_TOKEN, port = CONTROL_PORT, log = console.log } = {}) {
  if (!token) {
    log("[operator] no OPERATOR_CONTROL_TOKEN: operator unlock channel disabled");
    return null;
  }
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(req) {
      if (!tokenOk(req.headers.get("x-operator-control-token"), token)) return Response.json({ error: "forbidden" }, { status: 403 });
      const url = new URL(req.url);
      if (req.method === "GET" && url.pathname === "/status") return Response.json(operatorSessions.status(OPERATOR));
      if (req.method !== "POST") return Response.json({ error: "not found" }, { status: 404 });
      const body = await req.json().catch(() => ({}));
      if (url.pathname === "/lock") {
        operatorSessions.lock(OPERATOR);
        alertOnce(log);
        return Response.json({ unlocked: false, expiresAt: null });
      }
      if (url.pathname === "/unlock") {
        let key;
        try {
          key = base64ToBytes(String(body.data_key ?? ""));
        } catch {
          return Response.json({ error: "data_key is not base64" }, { status: 400 });
        }
        try {
          const vault = await getVault(db, OPERATOR);
          if (!vault || key.length !== 32 || !(await operatorSealer.verifyDataKey(key, vault.seal, OPERATOR))) {
            return Response.json({ error: "that key does not open the operator vault" }, { status: 403 });
          }
          const status = operatorSessions.unlock(OPERATOR, key, ttlOf(body.ttl));
          alerted = false;
          log("[operator] operator keys unlocked");
          return Response.json(status);
        } finally {
          wipe(key);
        }
      }
      return Response.json({ error: "not found" }, { status: 404 });
    },
  });
}
