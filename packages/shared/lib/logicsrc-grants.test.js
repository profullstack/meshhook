// meshhook's wiring of @profullstack/key-grants: recipient = the person's vault
// inbox, keys land in `secrets` under the requested project, revoke deletes.
import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { memoryStore } from "@profullstack/key-grants";
import { createVault, openUserSecret, userSealer } from "./vault.js";
import { meshhookKeyGrants, queryClient } from "./logicsrc-grants.js";

function fakeDb() {
  const vaults = new Map();
  const secrets = new Map();
  return {
    secrets,
    none: async (q, p = []) => {
      q = q.trim();
      if (/^create table/i.test(q)) return;
      if (/^insert into key_vaults/i.test(q)) vaults.set(p[0], { seal: p[1], operator_secrets: null });
      else if (/^insert into secrets/.test(q)) secrets.set(`${p[0]}:${p[1]}`, p[2]);
      else if (/^delete from secrets/.test(q)) secrets.delete(`${p[0]}:${p[1]}`);
      else throw new Error(`unexpected: ${q}`);
    },
    oneOrNone: async (q, p = []) => (/from key_vaults/.test(q) ? vaults.get(p[0]) ?? null : null),
    manyOrNone: async (q, p = []) => ({ q, p }),
  };
}

const sign = (secret, body, ts = Math.floor(Date.now() / 1000), id = "msg_1") => ({
  "webhook-id": id,
  "webhook-timestamp": String(ts),
  "webhook-signature": `v1,${createHmac("sha256", Buffer.from(secret)).update(`${id}.${ts}.${body}`).digest("base64")}`,
});

describe("meshhook keys from logicsrc", () => {
  it("adapts db.manyOrNone into the package's query client", async () => {
    expect(await queryClient(fakeDb()).query("select 1 where a = ?", [1])).toEqual({ q: "select 1 where a = ?", p: [1] });
  });

  it("start -> manifest -> signed delivery lands in the project's secrets; revoke deletes it", async () => {
    const db = fakeDb();
    const kg = meshhookKeyGrants({ db, origin: "https://meshhook.com", store: memoryStore() });
    await expect(kg.start({ userId: "u1", keys: "COINPAY_API_KEY", scope: "proj-1" })).rejects.toMatchObject({ code: "needs_vault" });
    const made = await userSealer.createSeal("correct horse battery staple", "u1");
    await createVault(db, "u1", made.seal);

    const url = new URL(await kg.start({ userId: "u1", keys: "COINPAY_API_KEY", next: "/secrets", scope: "proj-1" }));
    expect(url.origin + url.pathname).toBe("https://app.logicsrc.com/grant");
    const m = await kg.manifest(url.searchParams.get("nonce"));
    expect(m.recipient).toEqual({ format: "sealed-secrets/inbox-v2", app: "meshhook", scope: "workflow_secrets", user_id: "u1", inbox_public_key: made.seal.inbox_public_key });
    expect(m.webhook_url).toBe("https://meshhook.com/api/v1/logicsrc/webhook");

    const sealed = `sealed:v2:${JSON.stringify(await userSealer.sealToInbox(m.recipient.inbox_public_key, { COINPAY_API_KEY: "cp_live_fixture" }, "u1"))}`;
    const body = JSON.stringify({ type: "grant.delivered", grant_id: "g1", key_name: "COINPAY_API_KEY", recipient_user_id: "u1", sealed });
    expect((await kg.webhook(sign(m.webhook_secret, body), body)).status).toBe(200);
    expect(await openUserSecret(made.dek, made.seal, "u1", db.secrets.get("proj-1:COINPAY_API_KEY"))).toEqual({ COINPAY_API_KEY: "cp_live_fixture" });

    const rev = JSON.stringify({ type: "grant.revoked", grant_id: "g1", key_name: "COINPAY_API_KEY" });
    expect((await kg.webhook(sign(m.webhook_secret, rev), rev)).status).toBe(200);
    expect(db.secrets.has("proj-1:COINPAY_API_KEY")).toBe(false);
  });
});
