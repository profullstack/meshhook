import { availableParallelism } from "os";

const MB = 1024 * 1024;

function loadConfig() {
  const maxMemMb = parseInt(process.env.MAX_MEMORY_MB || "512", 10);
  const heapDump = process.env.HEAP_DUMP_ON_OOM === "true";
  const cpuLimit = parseFloat(process.env.CPU_LIMIT || availableParallelism().toString());

  return {
    maxMemBytes: maxMemMb * MB,
    maxMemMb,
    heapDump,
    cpuLimit,
    warnThreshold: parseFloat(process.env.MEMORY_WARN_THRESHOLD || "0.85"),
  };
}

const state = { config: loadConfig(), timer: null };

async function checkMemory() {
  const { heapUsed, rss } = process.memoryUsage();

  if (rss > state.config.maxMemBytes) {
    console.error(
      `resource-limits: RSS ${Math.round(rss / MB)}MB exceeds limit ${state.config.maxMemMb}MB`
    );
    if (state.config.heapDump) {
      try {
        const { writeHeapSnapshot } = await import("v8");
        writeHeapSnapshot();
      } catch { /* not available */ }
    }
    throw new Error("RESOURCE_EXCEEDED");
  }

  if (heapUsed > state.config.maxMemBytes * state.config.warnThreshold) {
    console.warn(
      `resource-limits: heap ${Math.round(heapUsed / MB)}MB approaching limit ${state.config.maxMemMb}MB`
    );
  }
}

export function startMemoryWatcher(intervalMs = 30_000) {
  if (state.timer) return;
  setImmediate(() => checkMemory().catch(() => {}));
  state.timer = setInterval(() => checkMemory().catch(() => {}), intervalMs);
  state.timer.unref();
}

export function stopMemoryWatcher() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

export function getResourceConfig() {
  return { ...state.config };
}
