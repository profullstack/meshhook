import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // describe/it/expect as globals, so the retry-strategy suite keeps working
    // with its original chai assertions.
    globals: true,
    environment: "node",
    // Only the suites that are actually written for vitest. src/nodes,
    // src/workers and src/utils use the node:test runner instead and are run by
    // `pnpm run test:node`; collecting them here just reports "no test suite".
    include: ["src/queue/**/*.test.js", "packages/**/*.test.js", "scripts/**/*.test.js"],
    exclude: ["**/node_modules/**", "apps/**"],
    // Queue tests exercise visibility timeouts and a polling worker.
    testTimeout: 15000,
  },
});
