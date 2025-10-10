#!/usr/bin/env node

import { existsSync, readlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const ENV_SYMLINK = join(rootDir, ".env");

async function migrate() {
  console.log("🔄 MeshHook Database Migration\n");

  // Detect current environment from .env symlink
  let environment = "unknown";
  let envFile = ".env";

  if (existsSync(ENV_SYMLINK)) {
    try {
      const target = readlinkSync(ENV_SYMLINK);
      envFile = target;

      if (target.includes(".env.local")) {
        environment = "local";
      } else if (target.includes(".env.staging")) {
        environment = "staging";
      } else if (target.includes(".env.production")) {
        environment = "production";
      }
    } catch (error) {
      console.log("⚠️  Could not read .env symlink, assuming direct .env file");
    }
  }

  console.log(`📍 Environment: ${environment}`);
  console.log(`📄 Using: ${envFile}\n`);

  if (environment === "unknown") {
    console.log("⚠️  Warning: Could not detect environment from .env symlink");
    console.log("💡 Run 'pnpm run setup' to configure your environment\n");
  }

  try {
    if (environment === "local") {
      console.log("🔄 Running local migration (db reset)...\n");
      execSync("pnpx supabase db reset", {
        stdio: "inherit",
        cwd: rootDir,
      });
      console.log("\n✅ Local database reset complete!");
    } else {
      console.log("🚀 Pushing migrations to remote database...\n");
      execSync("pnpx supabase db push", {
        stdio: "inherit",
        cwd: rootDir,
      });
      console.log("\n✅ Migrations pushed successfully!");
    }
  } catch (error) {
    console.error("\n❌ Migration failed!");
    console.error("Error:", error.message);

    if (environment === "local") {
      console.log("\n💡 Make sure Supabase is running:");
      console.log("   pnpx supabase start");
    } else {
      console.log("\n💡 Make sure you're linked to your Supabase project:");
      console.log("   pnpx supabase link --project-ref <your-project-ref>");
    }

    process.exit(1);
  }
}

migrate().catch((error) => {
  console.error("❌ Migration script failed:", error);
  process.exit(1);
});