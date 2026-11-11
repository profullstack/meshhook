import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createVault, openUserSecret, userSealer } from "./vault.js";
import { handleWebhook, manifestFor, parseKeyNames, startGrant, verifyWebhook } from "./logicsrc-grants.js";

/** Just enough of the db.* API for these tables. */
function fakeDb() {
  const t = { vaults: new Map(), requests: new Map(), grants: new Map(), secrets: new Map(), projects: new Map() };
  return {
    t,
    none: async (q, p = []) => {
      q = q.trim();
      if (/^create table/i.test(q)) return;
      if (/^insert into key_vaults/i.test(q)) t.vaults.set(p[0], { seal: p[1], operator_secrets: null });
      else if (/^insert into logicsrc_grant_requests/.test(q)) t.requests.set(p[0], { nonce: p[0], user_id: p[1], project_id: p[2], keys: p[3], webhook_secret: p[4], next_path: p[5], created_at: p[6], expires_at: p[7] });
      else if (/^insert into logicsrc_grants/.test(q)) t.grants.set(p[0], { grant_id: p[0], nonce: p[1], user_id: p[2], project_id: p[3], key_name: p[4], status: "active" });
      else if (/^update logicsrc_grants set status = 'revoked'/.test(q)) t.grants.get(p[1]).status = "revoked";
      else if (/^update logicsrc_grants/.test(q)) t.grants.get(p[1]).status = "active";
      else if (/^insert into secrets/.test(q)) t.secrets.set(`${p[0]}:${p[1]}`, p[2]);
      else if (/^delete from secrets/.test(q)) t.secrets.delete(`${p[0]}:${p[1]}`);
      else throw new Error(`unexpected: ${q}`);
    },
    one: async (q, p = []) => {
      if (/insert into projects/.test(q)) { t.projects.set(p[0], "proj-1"); return { id: "proj-1" }; }
      throw new Error(`unexpected one: ${q}`);
    },
    oneOrNone: async (q, p = []) => {
      if (/from key_vaults/.test(q)) return t.vaults.get(p[0]) ?? null;
      if (/from projects/.test(q)) return t.projects.has(p[0]) ? { id: t.projects.get(p[0]) } : null;
      if (/from logicsrc_grant_requests where nonce/.test(q)) return t.requests.get(p[0]) ?? null;
      if (/from logicsrc_grants where grant_id/.test(q)) return t.grants.get(p[0]) ?? null;
      throw new Error(`unexpected oneOrNone: ${q}`);
    },
    manyOrNone: async (q, p = []) => {
      if (/where nonce = \?/.test(q)) return [t.requests.get(p[0])].filter(Boolean);
      if (/where user_id = \?/.test(q)) return [...t.requests.values()].filter((r) => r.user_id === p[0]);
      throw new Error(`unexpected many: ${q}`);
    },
  };
}

const sign = (secret, body, ts = Math.floor(Date.now() / 1000), id = "msg_1") => ({
  "webhook-id": id,
  "webhook-timestamp": String(ts),
  "webhook-signature": `v1,${createHmac("sha256", Buffer.from(secret)).update(`${id}.${ts}.${body}`).digest("base64")}`,
});

describe("keys from logicsrc", () => {
  it("parses key names", () => {
    expect(parseKeyNames("A, B  A")).toEqual(["A", "B"]);
    expect(() => parseKeyNames("")).toThrow(/at least one/);
    expect(() => parseKeyNames("bad name!")).toThrow(/not a valid/);
  });

  it("start -> manifest -> signed delivery lands as a sealed secret the owner opens; rotation and revoke follow", async () => {
    const db = fakeDb();
    await expect(startGrant(db, { userId: "u1", keys: "COINPAY_API_KEY", origin: "https://meshhook.com" })).rejects.toMatchObject({ code: "needs_vault" });
    const made = await userSealer.createSeal("correct horse battery staple", "u1");
    await createVault(db, "u1", made.seal);

    const url = new URL(await startGrant(db, { userId: "u1", keys: "COINPAY_API_KEY", next: "/secrets", origin: "https://meshhook.com" }));
    expect(url.origin + url.pathname).toBe("https://logicsrc.com/grant");
    expect(url.searchParams.get("origin")).toBe("https://meshhook.com");
    const nonce = url.searchParams.get("nonce");

    const m = await manifestFor(db, nonce, { origin: "https://meshhook.com" });
    expect(m).toMatchObject({ v: 1, app_name: "MeshHook", keys: [{ name: "COINPAY_API_KEY" }], webhook_url: "https://meshhook.com/api/v1/logicsrc/webhook" });
    expect(m.recipient).toEqual({ format: "sealed-secrets/inbox-v2", app: "meshhook", scope: "workflow_secrets", user_id: "u1", inbox_public_key: made.seal.inbox_public_key });
    expect(m.return_url).toBe("https://meshhook.com/secrets?logicsrc=granted");
    expect(await manifestFor(db, "nope", { origin: "https://meshhook.com" })).toBeNull();
    expect(await manifestFor(db, nonce, { origin: "https://meshhook.com", now: Date.now() + 31 * 60_000 })).toBeNull();

    // What logicsrc's browser page produces.
    const sealed = `sealed:v2:${JSON.stringify(await userSealer.sealToInbox(m.recipient.inbox_public_key, { COINPAY_API_KEY: "cp_live_fixture" }, "u1"))}`;
    const body = JSON.stringify({ type: "grant.delivered", grant_id: "g1", request_id: "r1", key_name: "COINPAY_API_KEY", recipient_user_id: "u1", sealed });

    expect((await handleWebhook(db, sign("wrong-secret-wrong-secret-wrong!!", body), body)).status).toBe(401);
    const stale = sign(m.webhook_secret, body, Math.floor(Date.now() / 1000) - 600);
    expect((await handleWebhook(db, stale, body)).status).toBe(401);
    const ok = await handleWebhook(db, sign(m.webhook_secret, body), body);
    expect(ok).toMatchObject({ status: 200, body: { ok: true, key: "COINPAY_API_KEY" } });
    expect(await openUserSecret(made.dek, made.seal, "u1", db.t.secrets.get("proj-1:COINPAY_API_KEY"))).toEqual({ COINPAY_API_KEY: "cp_live_fixture" });

    // A key we never asked for is refused even with a good signature.
    const extra = JSON.stringify({ type: "grant.delivered", grant_id: "g2", key_name: "OTHER", recipient_user_id: "u1", sealed });
    expect((await handleWebhook(db, sign(m.webhook_secret, extra), extra)).status).toBe(400);

    // Rotation: found by grant id, replaces the value.
    const sealed2 = `sealed:v2:${JSON.stringify(await userSealer.sealToInbox(m.recipient.inbox_public_key, { COINPAY_API_KEY: "cp_live_rotated" }, "u1"))}`;
    const upd = JSON.stringify({ type: "grant.updated", grant_id: "g1", key_name: "COINPAY_API_KEY", recipient_user_id: "someone-else", sealed: sealed2 });
    expect((await handleWebhook(db, sign(m.webhook_secret, upd), upd)).status).toBe(200);
    expect(await openUserSecret(made.dek, made.seal, "u1", db.t.secrets.get("proj-1:COINPAY_API_KEY"))).toEqual({ COINPAY_API_KEY: "cp_live_rotated" });

    const rev = JSON.stringify({ type: "grant.revoked", grant_id: "g1", key_name: "COINPAY_API_KEY" });
    expect((await handleWebhook(db, sign(m.webhook_secret, rev), rev)).status).toBe(200);
    expect(db.t.secrets.has("proj-1:COINPAY_API_KEY")).toBe(false);
    expect(db.t.grants.get("g1").status).toBe("revoked");
  });

  it("verifies whsec_ secrets and multi-signature headers", () => {
    const secret = "whsec_" + Buffer.from("k".repeat(32)).toString("base64");
    const ts = Math.floor(Date.now() / 1000);
    const sig = `v1,${createHmac("sha256", Buffer.from("k".repeat(32))).update(`m.${ts}.b`).digest("base64")}`;
    expect(verifyWebhook(secret, { "webhook-id": "m", "webhook-timestamp": String(ts), "webhook-signature": `v1,AAAA ${sig}` }, "b")).toBe(true);
  });
});
