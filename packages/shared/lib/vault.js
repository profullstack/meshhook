/**
 * Key vaults (unlock-on-use fleet rule, 2026-10-28): nothing stored on our
 * servers may open a user's secrets, or our own operator keys.
 *
 * A vault is a seal record made from a passphrase where the passphrase is
 * typed (the browser for users, the operator CLI for the operator):
 * PBKDF2-SHA256 600k -> HKDF -> AES-256-GCM data key, wrapped by the
 * passphrase and a one-time recovery key, plus an inbox key pair. The server
 * keeps only the record.
 *
 *  - Workflow secrets are sealed to the owner's inbox public key: the server
 *    can seal, never open (`sealed:v2:` values in secrets.value_encrypted).
 *  - Operator keys (the x402 payer key) are sealed under the operator vault's
 *    data key, which a process holds only after an operator unlock (TTL, in
 *    memory; see operator-keys.js).
 */

import { bytesToBase64, createSealer, isInboxEntry, isSealRecord, wipe } from "@profullstack/sealed-secrets";

export { bytesToBase64, wipe };

export const userSealer = createSealer({ app: "meshhook", scope: "workflow_secrets" });
export const operatorSealer = createSealer({ app: "meshhook", scope: "operator" });
export const OPERATOR = "operator";
export const SEALED_PREFIX = "sealed:v2:";

let ensured = null;
/** The vaults table, made on first use (works on Postgres and libSQL). */
export function ensureVaultTable(db) {
  ensured ??= db
    .none(
      `create table if not exists key_vaults (
         owner text primary key,
         seal text not null,
         operator_secrets text,
         created_at text not null default (CURRENT_TIMESTAMP),
         updated_at text not null default (CURRENT_TIMESTAMP)
       )`,
    )
    .catch((e) => {
      ensured = null;
      throw e;
    });
  return ensured;
}

export async function getVault(db, owner) {
  await ensureVaultTable(db);
  const row = await db.oneOrNone("select seal, operator_secrets from key_vaults where owner = ?", [owner]);
  if (!row) return null;
  const seal = typeof row.seal === "string" ? JSON.parse(row.seal) : row.seal;
  if (!isSealRecord(seal)) return null;
  const secrets = row.operator_secrets ? (typeof row.operator_secrets === "string" ? JSON.parse(row.operator_secrets) : row.operator_secrets) : null;
  return { seal, operatorSecrets: secrets };
}

/** Store a new vault record. Refuses to replace an existing one. */
export async function createVault(db, owner, seal) {
  if (!isSealRecord(seal)) throw Object.assign(new Error("not a seal record"), { status: 400 });
  await ensureVaultTable(db);
  if (await getVault(db, owner)) throw Object.assign(new Error("A key vault already exists."), { status: 409 });
  await db.none("insert into key_vaults (owner, seal) values (?, ?)", [owner, JSON.stringify(seal)]);
}

export class VaultMissingError extends Error {
  constructor() {
    super("Set up your key vault first (Secrets > Key vault): secret values are sealed with a passphrase only you hold.");
    this.status = 409;
  }
}

/** Seal a workflow secret to the owner's inbox. The server cannot open the result. */
export async function sealUserSecret(db, userId, key, value) {
  const vault = await getVault(db, userId);
  if (!vault) throw new VaultMissingError();
  const entry = await userSealer.sealToInbox(vault.seal.inbox_public_key, { [key]: String(value) }, userId);
  return SEALED_PREFIX + JSON.stringify(entry);
}

/** Open a sealed workflow secret with the owner's data key (browser or an unlocked worker). */
export async function openUserSecret(dek, seal, userId, stored) {
  if (typeof stored !== "string" || !stored.startsWith(SEALED_PREFIX)) throw new Error("not a sealed secret");
  const entry = JSON.parse(stored.slice(SEALED_PREFIX.length));
  if (!isInboxEntry(entry)) throw new Error("not a sealed secret");
  const { patch } = await userSealer.openInbox(dek, seal, [entry], userId);
  return patch;
}

export function legacyKeyMigrationEnabled(env = process.env) {
  return String(env.LEGACY_KEY_MIGRATION ?? "").trim().toLowerCase() !== "off";
}
