export function createShutdown({ pool, label = "worker", preStop, onShutdown } = {}) {
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${label}: received ${signal}, draining...`);

    try {
      if (preStop) await preStop();

      if (pool) {
        await pool.end();
        console.log(`${label}: pool closed`);
      }
    } catch (err) {
      console.error(`${label}: shutdown error:`, err);
    }

    if (onShutdown) await onShutdown();
    process.exit(0);
  }

  function register() {
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  return { register, shutdown };
}
