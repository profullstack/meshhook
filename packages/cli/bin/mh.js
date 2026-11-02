#!/usr/bin/env node
import { spawn } from "node:child_process";
import minimist from "minimist";
import { blue, green, gray } from "kleur/colors.js";

const args = minimist(process.argv.slice(2));
const cmd = args._[0];

function run(bin, argv, opts = {}) {
  console.log(gray(`$ ${bin} ${argv.join(" ")}`));
  const p = spawn(bin, argv, { stdio: "inherit", shell: true, ...opts });
  p.on("exit", (code) => process.exit(code ?? 0));
}

switch (cmd) {
  case "dev:web":
    console.log(blue("MeshHook — starting Web (SvelteKit)…"));
    run("bun", ["--filter", "@meshhook/web", "dev"]);
    break;
  case "start:orch":
    console.log(blue("MeshHook — starting Orchestrator…"));
    run("bun", ["workers/orchestrator.mjs"]);
    break;
  case "start:http":
    // Steps run inside the orchestrator now (locally or on c0mpute).
    console.log(blue("MeshHook — the HTTP executor is part of the orchestrator; starting it…"));
    run("bun", ["workers/orchestrator.mjs"]);
    break;
  case "c0mpute": {
    const { C0mputeClient, executionMode } = await import("../../../src/engine/c0mpute.js");
    const { aiSettings } = await import("../../../src/engine/ai.js");
    const client = new C0mputeClient();
    const health = await client.health();
    const ai = aiSettings();
    const report = {
      executor: executionMode({}),
      bridge: { url: client.url, token: client.token ? "set" : "missing", health: health ?? "unreachable" },
      inference: { url: ai.baseUrl, client_key: ai.apiKey ? "set" : "public budget", models: ai.models },
    };
    console.log(args.json ? JSON.stringify(report) : JSON.stringify(report, null, 2));
    process.exit(health || report.executor === "local" ? 0 : 1);
  }
  case "migrate":
    console.log(green("Applying schema.sql to $DATABASE_URL…"));
    run("psql", ["$DATABASE_URL", "-f", "schema.sql"], { env: process.env });
    break;
  default:
    console.log(`
${green("MeshHook CLI (mh)")}

Usage:
  mh dev:web        Start SvelteKit (UI/API)
  mh start:orch     Start Orchestrator worker
  mh start:http     Alias of start:orch (steps run in the orchestrator)
  mh c0mpute        Show the step executor, c0mpute bridge and inference status [--json]
  mh migrate        Apply schema.sql to DATABASE_URL

Examples:
  mh dev:web
  mh start:orch
  mh start:http
  DATABASE_URL=postgres://... mh migrate
`);
}
