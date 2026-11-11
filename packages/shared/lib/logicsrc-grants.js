/**
 * Keys from logicsrc, through the house package @profullstack/key-grants.
 *
 * meshhook's part is only the wiring: a person's recipient is their key-vault
 * inbox, a key lands in `secrets` under the project it was requested for
 * (scope = project id), and a revoke deletes it. The package does the request
 * nonces, the manifest logicsrc fetches over TLS, and the signed webhook.
 */

import { createKeyGrants, sqlStore, KeyGrantError } from "@profullstack/key-grants";
import { db as sharedDb } from "./db.js";
import { getVault } from "./vault.js";
import { ensureDefaultProject } from "./authz.js";

export { KeyGrantError };
export const LOGICSRC_URL = (process.env.LOGICSRC_URL ?? "https://app.logicsrc.com").replace(/\/$/, "");

/** meshhook's db.* (`?` placeholders) as the query client sqlStore expects. */
export const queryClient = (db) => ({ query: (sql, params) => db.manyOrNone(sql, params) });

export function meshhookKeyGrants({ db = sharedDb, origin = process.env.ORIGIN ?? "https://meshhook.com", store, now } = {}) {
  return createKeyGrants({
    appName: "MeshHook",
    origin,
    logicsrcUrl: LOGICSRC_URL,
    // kg_ prefix: the hand-rolled logicsrc_* tables (11-11, test rows only) had other columns.
    store: store ?? sqlStore(queryClient(db), { prefix: "kg_" }),
    now,
    describeKey: () => "Used by your MeshHook workflows; opens only while your vault is unlocked for runs",
    recipientFor: async (userId) => {
      const vault = await getVault(db, userId);
      return vault ? { app: "meshhook", scope: "workflow_secrets", user_id: userId, inbox_public_key: vault.seal.inbox_public_key } : null;
    },
    onKey: async ({ scope, keyName, sealed }) => {
      await db.none(
        `insert into secrets (project_id, key, value_encrypted) values (?, ?, ?)
         on conflict (project_id, key) do update set value_encrypted = excluded.value_encrypted`,
        [scope, keyName, sealed],
      );
    },
    onRevoke: async ({ scope, keyName }) => {
      await db.none("delete from secrets where project_id = ? and key = ?", [scope, keyName]);
    },
  });
}

let shared = null;
export const keyGrants = () => (shared ??= meshhookKeyGrants());

/** Keys requested from the Secrets page land in the person's default project. */
export async function startResponse({ db = sharedDb, userId, keys, next }) {
  const scope = userId ? await ensureDefaultProject(userId, "Default Project", db) : null;
  return keyGrants().startResponse({ userId, keys, next, scope, errorPath: "/secrets" });
}
