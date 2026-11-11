import { afterEach, describe, expect, it } from "vitest";
import { createVault, sealUserSecret, userSealer } from "./vault.js";
import { SecretMissingError, VaultLockedError, _resetUserSessions, openSecrets, referencedSecrets, unlockUser, userSessions } from "./user-keys.js";

function fakeDb() {
  const vaults = new Map();
  const secrets = [];
  const projects = new Map([["proj-1", { owner: "user-1" }]]);
  return {
    secrets,
    none: async (q, p = []) => {
      if (/^insert into key_vaults/i.test(q.trim())) vaults.set(p[0], { seal: p[1], operator_secrets: null });
    },
    oneOrNone: async (q, p = []) => (/from projects/.test(q) ? projects.get(p[0]) ?? null : vaults.get(p[0]) ?? null),
    manyOrNone: async (_q, [projectId, ...names]) => secrets.filter((s) => s.project_id === projectId && names.includes(s.key)),
  };
}

afterEach(() => _resetUserSessions());

describe("run-time secrets", () => {
  it("finds {{$secrets.NAME}} references", () => {
    expect(referencedSecrets({ h: "Bearer {{$secrets.A_KEY}}", u: "{{ $secret.b }}", x: "{{secrets}}" })).toEqual(["A_KEY", "b"]);
  });

  it("locked until the owner unlocks with the right key; then opens only what was asked", async () => {
    const db = fakeDb();
    const made = await userSealer.createSeal("correct horse battery staple", "user-1");
    await createVault(db, "user-1", made.seal);
    const value = ["fixture", Date.now()].join("-");
    db.secrets.push({ project_id: "proj-1", key: "DEMO", value_encrypted: await sealUserSecret(db, "user-1", "DEMO", value) });
    db.secrets.push({ project_id: "proj-1", key: "OTHER", value_encrypted: await sealUserSecret(db, "user-1", "OTHER", "o") });

    await expect(openSecrets(db, "proj-1", ["DEMO"])).rejects.toBeInstanceOf(VaultLockedError);
    await expect(openSecrets(db, "proj-1", ["NOPE"])).rejects.toBeInstanceOf(SecretMissingError);

    const wrong = await userSealer.createSeal("another passphrase here", "user-1");
    expect(await unlockUser(db, "user-1", wrong.dek, 60)).toBeNull();
    expect(await unlockUser(db, "user-1", made.dek, 60)).toMatchObject({ unlocked: true });
    expect(await openSecrets(db, "proj-1", ["DEMO"])).toEqual({ DEMO: value });

    userSessions.lock("user-1");
    await expect(openSecrets(db, "proj-1", ["DEMO"])).rejects.toBeInstanceOf(VaultLockedError);
  });
});
