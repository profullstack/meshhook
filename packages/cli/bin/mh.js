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
    run("pnpm", ["--filter", "@meshhook/web", "dev"]);
    break;
  case "start:orch":
    console.log(blue("MeshHook — starting Orchestrator…"));
    run("node", ["workers/orchestrator.mjs"]);
    break;
  case "start:http":
    console.log(blue("MeshHook — starting HTTP Executor…"));
    run("node", ["workers/http-exec.mjs"]);
    break;
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
  mh start:http     Start HTTP Executor worker
  mh migrate        Apply schema.sql to DATABASE_URL

Examples:
  mh dev:web
  mh start:orch
  mh start:http
  DATABASE_URL=postgres://... mh migrate
`);
}
