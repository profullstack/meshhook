/**
 * MeshHook combined process supervisor.
 *
 * Railway runs one start command per service, but MeshHook needs two
 * long-running things:
 *
 *   web           the SvelteKit app (UI, auth, and the /api/hooks/[slug]
 *                 webhook endpoint that enqueues runs)
 *   orchestrator  the queue workers that drain workflow_jobs / workflow_steps
 *
 * They run as two child processes rather than in one Node process on purpose.
 * Both halves install their own SIGTERM/SIGINT handlers, and those handlers are
 * incompatible in a shared process: adapter-node drains in-flight requests and
 * deliberately never calls process.exit, while the orchestrator exits as soon
 * as its workers stop. Combined, the orchestrator's exit would cut off requests
 * the web server was still draining. Separate processes keep each half's
 * shutdown exactly as it was designed and tested, and stop a thrown error in a
 * workflow step from taking the HTTP server down with it.
 *
 * The trade-off is ~50MB of extra RSS for the second Node process, which is
 * cheap next to losing responses on every redeploy.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

// Railway SIGKILLs a container that has not exited ~30s after SIGTERM. Give the
// children a little less than that so their own graceful paths finish first and
// we still get to log the outcome.
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS ?? 25_000);

/**
 * SvelteKit rejects form posts whose Origin does not match the app's own, and
 * adapter-node cannot infer that origin from behind Railway's proxy — every
 * login and every form action 403s without it. Railway injects the public
 * domain, so derive ORIGIN from it rather than making it another variable that
 * has to be set by hand and re-set whenever the domain changes.
 */
export function resolveOrigin(env = process.env) {
  if (env.ORIGIN) return env.ORIGIN;
  if (env.RAILWAY_PUBLIC_DOMAIN) return `https://${env.RAILWAY_PUBLIC_DOMAIN}`;
  return null;
}

/** Build the environment handed to both children. */
export function buildChildEnv(env = process.env) {
  const origin = resolveOrigin(env);
  return {
    ...env,
    ...(origin ? { ORIGIN: origin } : {}),
    // adapter-node waits SHUTDOWN_TIMEOUT seconds (default 30) before forcing
    // connections closed, which would outlast our own grace period and get the
    // whole container SIGKILLed mid-drain.
    SHUTDOWN_TIMEOUT: env.SHUTDOWN_TIMEOUT ?? "20",
  };
}

const origin = resolveOrigin();
const childEnv = buildChildEnv();

/** Tag each line so the two log streams stay tellable apart in Railway. */
export function pipeWithPrefix(stream, prefix, sink) {
  let buffer = "";

  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    // The last element is whatever came after the final newline: hold it back
    // until the rest of that line arrives, or prefixes land mid-sentence.
    buffer = lines.pop() ?? "";
    for (const line of lines) sink.write(`${prefix} ${line}\n`);
  });
  stream.on("end", () => {
    if (buffer) sink.write(`${prefix} ${buffer}\n`);
  });
}

const children = [];
let shuttingDown = false;

function start(name, scriptPath, options = {}) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: options.cwd ?? rootDir,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  pipeWithPrefix(child.stdout, `[${name}]`, process.stdout);
  pipeWithPrefix(child.stderr, `[${name}]`, process.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      console.log(`[supervisor] ${name} stopped (${signal ?? `code ${code}`})`);
      return;
    }

    // Neither half is optional: a live web server with no orchestrator accepts
    // webhooks and never runs them, and an orchestrator with no web server has
    // nothing feeding it. Take the container down so Railway restarts both and
    // the failure is visible, instead of silently serving half a product.
    console.error(`[supervisor] ${name} exited unexpectedly (${signal ?? `code ${code}`})`);
    shutdown(`${name} died`, code === 0 ? 1 : (code ?? 1));
  });

  child.on("error", (error) => {
    console.error(`[supervisor] failed to spawn ${name}: ${error.message}`);
    shutdown(`${name} failed to spawn`, 1);
  });

  children.push({ name, child });
  return child;
}

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[supervisor] ${reason}; stopping children...`);

  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }

  const forceTimer = setTimeout(() => {
    console.error("[supervisor] grace period elapsed; forcing children down");
    for (const { child } of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    process.exit(exitCode);
  }, SHUTDOWN_GRACE_MS);

  // Don't let the timer itself hold the process open once everyone is gone.
  forceTimer.unref();

  const waits = children.map(
    ({ child }) =>
      new Promise((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        child.once("exit", resolve);
      }),
  );

  Promise.all(waits).then(() => {
    clearTimeout(forceTimer);
    console.log("[supervisor] all children stopped");
    process.exit(exitCode);
  });
}

export function main() {
  if (!origin) {
    console.warn(
      "[supervisor] neither ORIGIN nor RAILWAY_PUBLIC_DOMAIN is set — SvelteKit will " +
        "reject form posts with 403. Set ORIGIN to the app's public URL.",
    );
  }

  console.log("[supervisor] starting MeshHook (web + orchestrator)");
  if (origin) console.log(`[supervisor] origin: ${origin}`);

  start("web", join(rootDir, "apps/web/build/index.js"), { cwd: join(rootDir, "apps/web") });
  start("orchestrator", join(rootDir, "workers/orchestrator.mjs"));

  process.on("SIGTERM", () => shutdown("SIGTERM received"));
  process.on("SIGINT", () => shutdown("SIGINT received"));
}

// Guarded so the helpers above can be imported by tests without spawning
// anything, matching the pattern in workers/orchestrator.mjs.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
