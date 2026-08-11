#!/usr/bin/env node

/**
 * Apply Socket.dev security patches, as a postinstall step.
 *
 * This used to be inline in package.json:
 *
 *   "postinstall": "npx @socketsecurity/socket-patch apply --silent --ecosystems npm && ..."
 *
 * which broke every deploy. `npx` downloads the package on each install, and
 * the patcher exits non-zero when SOCKET_API_TOKEN is unset — so an install in
 * any environment without a token failed outright, taking the build with it.
 * That is what Railway hit; it is not specific to npm or pnpm.
 *
 * Patching is a hardening step, not a build requirement, so this wrapper:
 *   - skips entirely when no token is configured,
 *   - never exits non-zero, whatever the patcher does,
 *   - stays quiet unless something is worth reporting.
 *
 * Set SOCKET_API_TOKEN to enable it. Set SKIP_SOCKET_PATCH=1 to force-skip.
 */

import { spawnSync } from "node:child_process";

const token = process.env.SOCKET_API_TOKEN;

if (process.env.SKIP_SOCKET_PATCH === "1") {
  console.log("• Socket patches skipped (SKIP_SOCKET_PATCH=1)");
  process.exit(0);
}

if (!token) {
  // The free proxy the patcher falls back to is what exits 1, so there is
  // nothing to gain by running it here.
  console.log("• Socket patches skipped (no SOCKET_API_TOKEN set)");
  process.exit(0);
}

const result = spawnSync(
  "npx",
  ["--yes", "@socketsecurity/socket-patch", "apply", "--silent", "--ecosystems", "npm"],
  { stdio: "inherit", shell: process.platform === "win32" },
);

if (result.error) {
  console.warn(`⚠ Socket patch step could not run: ${result.error.message}`);
} else if (result.status !== 0) {
  console.warn(`⚠ Socket patch step exited ${result.status}; continuing anyway.`);
} else {
  console.log("✅ Socket patches applied");
}

// Always succeed: a failed hardening pass must not fail the install.
process.exit(0);
