#!/usr/bin/env bun
/**
 * Operator vault CLI (unlock-on-use, 2026-10-28). Run inside the app
 * container so it reaches the orchestrator's loopback control port:
 *
 *   docker exec -it meshhookcom-app-1 bun scripts/operator-vault.mjs init
 *   docker exec -it meshhookcom-app-1 bun scripts/operator-vault.mjs seal-x402     # seals $X402_PRIVATE_KEY (or stdin)
 *   docker exec -it meshhookcom-app-1 bun scripts/operator-vault.mjs unlock [--ttl 7d]
 *   docker exec -it meshhookcom-app-1 bun scripts/operator-vault.mjs lock|status
 *
 * The passphrase is typed here and never leaves this process; only the
 * derived data key goes to the orchestrator, which keeps it in memory for
 * the TTL (default and max 7d). Lost passphrase AND recovery key = the sealed
 * key is gone; seal it again from the logicsrc vault.
 */

import { createInterface } from "node:readline";
import { db } from "@meshhook/shared/lib/db.js";
import { OPERATOR, bytesToBase64, createVault, getVault, operatorSealer, wipe } from "@meshhook/shared/lib/vault.js";
import { CONTROL_PORT, readControlToken } from "@meshhook/shared/lib/operator-keys.js";

function ask(question, { hidden = true } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => (s.includes(question) ? process.stdout.write(s) : undefined);
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a);
    });
  });
}

async function control(path, body) {
  const token = readControlToken();
  if (!token) throw new Error("no operator control token in this container (is the app running?)");
  const res = await fetch(`http://127.0.0.1:${CONTROL_PORT}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-operator-control-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `control said ${res.status}`);
  return json;
}

async function dataKey(vault) {
  const useRecovery = process.argv.includes("--recovery");
  const secret = await ask(useRecovery ? "Recovery key: " : "Operator vault passphrase: ");
  return useRecovery ? operatorSealer.unlockSealWithRecovery(vault.seal, secret, OPERATOR) : operatorSealer.unlockSeal(vault.seal, secret, OPERATOR);
}

const flag = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main(cmd) {
  if (cmd === "status") {
    const vault = await getVault(db, OPERATOR);
    const s = await control("/status").catch((e) => ({ error: e.message }));
    console.log(JSON.stringify({ vault: Boolean(vault), x402_sealed: Boolean(vault?.operatorSecrets), ...s }));
    return;
  }
  if (cmd === "lock") {
    console.log(JSON.stringify(await control("/lock", {})));
    return;
  }
  if (cmd === "init") {
    if (await getVault(db, OPERATOR)) throw new Error("the operator vault already exists");
    const p1 = await ask("New operator vault passphrase (12+ chars): ");
    const p2 = await ask("Again: ");
    if (p1 !== p2) throw new Error("the passphrases differ");
    const made = await operatorSealer.createSeal(p1, OPERATOR);
    await createVault(db, OPERATOR, made.seal);
    wipe(made.dek);
    console.log("\nOperator vault created. Recovery key (shown once, store it with the passphrase):\n");
    console.log(`  ${made.recoveryKey}\n`);
    return;
  }
  const vault = await getVault(db, OPERATOR);
  if (!vault) throw new Error("no operator vault yet: run init first");
  if (cmd === "seal-x402") {
    let key = process.env.X402_PRIVATE_KEY ?? "";
    if (process.argv.includes("--stdin") || !key) key = (await ask("x402 payer private key: ")).trim();
    if (!key) throw new Error("no key given");
    const dek = await dataKey(vault);
    try {
      const blob = await operatorSealer.sealSecrets(dek, { x402: key }, OPERATOR);
      await db.none("update key_vaults set operator_secrets = ?, updated_at = CURRENT_TIMESTAMP where owner = ?", [JSON.stringify(blob), OPERATOR]);
      console.log("x402 key sealed. Remove X402_PRIVATE_KEY from app.env, then unlock.");
    } finally {
      wipe(dek);
    }
    return;
  }
  if (cmd === "unlock") {
    const dek = await dataKey(vault);
    try {
      console.log(JSON.stringify(await control("/unlock", { data_key: bytesToBase64(dek), ttl: flag("ttl") ?? "7d" })));
    } finally {
      wipe(dek);
    }
    return;
  }
  throw new Error("usage: operator-vault.mjs init | seal-x402 [--stdin] | unlock [--ttl 7d] [--recovery] | lock | status");
}

main(process.argv[2])
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  });
