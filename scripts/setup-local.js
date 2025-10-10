#!/usr/bin/env node

import inquirer from "inquirer";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const LOCAL_ENV_FILE = join(rootDir, ".env.local");
const ENV_SYMLINK = join(rootDir, ".env");

async function setupLocal() {
  console.log("🔧 MeshHook Local Environment Setup\n");

  // Check if .env.local already exists
  if (existsSync(LOCAL_ENV_FILE)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: ".env.local already exists. Overwrite it?",
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log("✅ Keeping existing .env.local");
      await createSymlink();
      return;
    }
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "databaseUrl",
      message: "PostgreSQL connection string:",
      default: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      validate: (input) =>
        input.startsWith("postgresql://") || "Must be a valid PostgreSQL URL",
    },
    {
      type: "input",
      name: "supabaseUrl",
      message: "Supabase API URL:",
      default: "http://127.0.0.1:54321",
      validate: (input) => input.startsWith("http") || "Must be a valid URL",
    },
    {
      type: "input",
      name: "supabaseAnonKey",
      message: "Supabase Anon Key:",
      default:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    },
    {
      type: "input",
      name: "supabaseServiceRoleKey",
      message: "Supabase Service Role Key:",
      default:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
    },
    {
      type: "input",
      name: "port",
      message: "Application port:",
      default: "3000",
      validate: (input) => {
        const port = parseInt(input);
        return (
          (!isNaN(port) && port > 0 && port < 65536) ||
          "Must be a valid port number"
        );
      },
    },
  ]);

  const envContent = `# Local Development Environment Variables
# This file is committed to GitHub for easy local setup
# DO NOT put production secrets here!

# Supabase Local Development
DATABASE_URL=${answers.databaseUrl}
SUPABASE_URL=${answers.supabaseUrl}
SUPABASE_ANON_KEY=${answers.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${answers.supabaseServiceRoleKey}

# Application Settings
NODE_ENV=development
PORT=${answers.port}
`;

  try {
    writeFileSync(LOCAL_ENV_FILE, envContent, "utf8");
    console.log(`\n✅ Created ${LOCAL_ENV_FILE}`);

    await createSymlink();

    console.log("\n🎉 Local environment setup complete!");
    console.log("\nNext steps:");
    console.log("  1. Run: pnpx supabase start");
    console.log("  2. Run: pnpm run dev");
  } catch (error) {
    console.error("❌ Error creating .env.local:", error.message);
    process.exit(1);
  }
}

async function createSymlink() {
  try {
    // Remove existing symlink if it exists
    if (existsSync(ENV_SYMLINK)) {
      unlinkSync(ENV_SYMLINK);
    }

    // Create symlink from .env to .env.local
    const { symlinkSync } = await import("fs");
    symlinkSync(".env.local", ENV_SYMLINK);
    console.log("✅ Created symlink: .env -> .env.local");
  } catch (error) {
    console.error("⚠️  Could not create symlink:", error.message);
    console.log("💡 You can manually copy .env.local to .env if needed");
  }
}

setupLocal().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});