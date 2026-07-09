import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startMemoryWatcher, stopMemoryWatcher, getResourceConfig } from "../resource-limits.js";

describe("resource-limits", () => {
  afterEach(() => {
    stopMemoryWatcher();
  });

  it("should provide default config", () => {
    const cfg = getResourceConfig();
    assert.equal(cfg.maxMemMb, 512);
    assert.equal(cfg.maxMemBytes, 512 * 1024 * 1024);
    assert.equal(typeof cfg.cpuLimit, "number");
    assert.ok(cfg.cpuLimit > 0);
  });

  it("should start and stop memory watcher without error", () => {
    startMemoryWatcher(60_000);
    stopMemoryWatcher();
    assert.ok(true);
  });

  it("should be idempotent when started twice", () => {
    startMemoryWatcher(60_000);
    startMemoryWatcher(60_000);
    stopMemoryWatcher();
    assert.ok(true);
  });
});
