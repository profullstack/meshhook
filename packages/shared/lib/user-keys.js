/**
 * Workflow secrets at run time, under the unlock-on-use rule.
 *
 * Secrets are sealed to the owner's key vault; this server cannot open them
 * on its own. To let unattended runs use them, the owner unlocks from the
 * Secrets page: the browser derives the vault's data key from the passphrase
 * and hands only that key to the orchestrator (web -> loopback control
 * server, see operator-keys.js). It lives in this process's memory for the
 * chosen TTL (default 8h, max 7d). A restart, the TTL or Lock forgets it, and
 * steps that need a secret wait for the next unlock.
 */

import { UnlockStore } from "@profullstack/sealed-secrets";
import { SEALED_PREFIX, getVault, openUserSecret, userSealer } from "./vault.js";

export let userSessions = new UnlockStore();
export function _resetUserSessions(store = new UnlockStore({ useTimers: false })) {
  userSessions = store;
}

export class VaultLockedError extends Error {
  constructor(names) {
    super(
      `This step needs the secret${names.length > 1 ? "s" : ""} ${names.join(", ")} and your key vault is locked. ` +
        "Open Secrets > Key vault and choose \"Unlock for runs\"; the step retries on its own.",
    );
    this.name = "VaultLockedError";
  }
}

export class SecretMissingError extends Error {
  constructor(names) {
    super(`No secret named ${names.join(", ")} in this workflow's project. Add it on the Secrets page.`);
    this.name = "SecretMissingError";
  }
}

/** Names a config refers to as {{$secrets.NAME}} (or {{$secret.NAME}}). */
export function referencedSecrets(value) {
  const names = new Set();
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  for (const m of text.matchAll(/\{\{\s*\$secrets?\.([A-Za-z0-9_.-]+)\s*\}\}/g)) names.add(m[1]);
  return [...names];
}

/** Verify a data key against the user's vault and hold it for `ttl` seconds. */
export async function unlockUser(db, userId, key, ttl) {
  const vault = await getVault(db, userId);
  if (!vault || key.length !== 32 || !(await userSealer.verifyDataKey(key, vault.seal, userId))) return null;
  return userSessions.unlock(userId, key, ttl);
}

/**
 * Open the named secrets of a project for one step. Only the names asked for
 * are opened; values never leave this call's result.
 */
export async function openSecrets(db, projectId, names) {
  if (!names.length) return {};
  const project = await db.oneOrNone("select owner from projects where id = ?", [projectId]);
  if (!project) throw new SecretMissingError(names);
  const marks = names.map(() => "?").join(", ");
  const rows = await db.manyOrNone(
    `select key, value_encrypted from secrets where project_id = ? and key in (${marks})`,
    [projectId, ...names],
  );
  const found = new Map(rows.map((r) => [r.key, r.value_encrypted]));
  const missing = names.filter((n) => !found.has(n));
  if (missing.length) throw new SecretMissingError(missing);

  const dek = userSessions.get(project.owner);
  if (!dek) throw new VaultLockedError(names);
  const vault = await getVault(db, project.owner);
  if (!vault) throw new VaultLockedError(names);

  const out = {};
  for (const [name, stored] of found) {
    const text = typeof stored === "string" ? stored : Buffer.from(stored).toString("utf8");
    if (!text.startsWith(SEALED_PREFIX)) throw new SecretMissingError([`${name} (stored before the key vault; re-save it on the Secrets page)`]);
    const patch = await openUserSecret(dek, vault.seal, project.owner, text);
    out[name] = patch[name] ?? Object.values(patch)[0];
  }
  return out;
}
