/**
 * Tests for the combined-process supervisor helpers.
 *
 * The spawn/shutdown paths are exercised by actually deploying; what is worth
 * pinning down here is the ORIGIN derivation (getting it wrong 403s every form
 * post in production) and the log prefixing.
 */

import { PassThrough } from "node:stream";
import { buildChildEnv, pipeWithPrefix, resolveOrigin } from "./server.mjs";

describe("resolveOrigin", () => {
  it("prefers an explicit ORIGIN", () => {
    const origin = resolveOrigin({
      ORIGIN: "https://meshhook.com",
      RAILWAY_PUBLIC_DOMAIN: "meshhook.up.railway.app",
    });
    expect(origin).toBe("https://meshhook.com");
  });

  it("derives https from the Railway public domain", () => {
    expect(resolveOrigin({ RAILWAY_PUBLIC_DOMAIN: "meshhook.up.railway.app" })).toBe(
      "https://meshhook.up.railway.app",
    );
  });

  it("returns null when neither is set, so the caller can warn", () => {
    expect(resolveOrigin({})).toBeNull();
  });
});

describe("buildChildEnv", () => {
  it("injects the derived ORIGIN for the children", () => {
    const env = buildChildEnv({ RAILWAY_PUBLIC_DOMAIN: "example.up.railway.app" });
    expect(env.ORIGIN).toBe("https://example.up.railway.app");
  });

  it("keeps adapter-node's shutdown inside the supervisor's grace period", () => {
    expect(buildChildEnv({}).SHUTDOWN_TIMEOUT).toBe("20");
  });

  it("does not override an explicit SHUTDOWN_TIMEOUT", () => {
    expect(buildChildEnv({ SHUTDOWN_TIMEOUT: "5" }).SHUTDOWN_TIMEOUT).toBe("5");
  });

  it("passes the rest of the environment through", () => {
    expect(buildChildEnv({ TURSO_DATABASE_URL: "libsql://x" }).TURSO_DATABASE_URL).toBe(
      "libsql://x",
    );
  });
});

describe("pipeWithPrefix", () => {
  /** Collect what the sink received. */
  function sink() {
    const written = [];
    return { written, write: (chunk) => written.push(chunk) };
  }

  it("prefixes each complete line", async () => {
    const source = new PassThrough();
    const out = sink();

    pipeWithPrefix(source, "[web]", out);
    source.end("one\ntwo\n");

    await new Promise((resolve) => source.on("end", resolve));
    expect(out.written).toEqual(["[web] one\n", "[web] two\n"]);
  });

  it("holds back a partial line until its newline arrives", async () => {
    const source = new PassThrough();
    const out = sink();

    pipeWithPrefix(source, "[web]", out);
    source.write("half");
    // Nothing should be emitted yet, or the prefix lands mid-sentence.
    expect(out.written).toEqual([]);

    source.end("-line\n");
    await new Promise((resolve) => source.on("end", resolve));
    expect(out.written).toEqual(["[web] half-line\n"]);
  });

  it("flushes a trailing line that never got a newline", async () => {
    const source = new PassThrough();
    const out = sink();

    pipeWithPrefix(source, "[orchestrator]", out);
    source.end("no trailing newline");

    await new Promise((resolve) => source.on("end", resolve));
    expect(out.written).toEqual(["[orchestrator] no trailing newline\n"]);
  });
});
