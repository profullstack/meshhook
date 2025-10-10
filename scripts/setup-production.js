#!/usr/bin/env node

import inquirer from "inquirer";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const PRODUCTION_ENV_FILE = join(rootDir, ".env.production");
const ENV_SYMLINK = join(rootDir, ".env");

async function setupProduction() {
  console.log("🚀 MeshHook Production Environment Setup\n");
  console.log("⚠️  WARNING: This will create .env.production with sensitive credentials.");
  console.log("⚠️  Make sure .env.production is in .gitignore!\n");

  // Check if .env.production already exists
  if (existsSync(PRODUCTION_ENV_FILE)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: ".env.production already exists. Overwrite it?",
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log("✅ Keeping existing .env.production");
      await createSymlink();
      return;
    }
  }

  console.log("\n📝 Enter your Supabase production credentials:");
  console.log("   (Find these in your Supabase project dashboard)\n");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectRef",
      message: "Supabase Project Reference (e.g., abcdefghijklmnop):",
      validate: (input) =>
        input.length > 0 || "Project reference is required",
    },
    {
      type: "password",
      name: "dbPassword",
      message: "Database Password:",
      validate: (input) => input.length > 0 || "Database password is required",
      mask: "*",
    },
    {
      type: "input",
      name: "supabaseAnonKey",
      message: "Supabase Anon/Public Key:",
      validate: (input) => input.length > 0 || "Anon key is required",
    },
    {
      type: "password",
      name: "supabaseServiceRoleKey",
      message: "Supabase Service Role Key:",
      validate: (input) => input.length > 0 || "Service role key is required",
      mask: "*",
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

  // Construct URLs from project reference
  const databaseUrl = `postgresql://postgres:${answers.dbPassword}@db.${answers.projectRef}.supabase.co:5432/postgres`;
  const supabaseUrl = `https://${answers.projectRef}.supabase.co`;

  const envContent = `# Production Environment Variables
# NEVER commit this file to version control!
# This file contains sensitive production credentials

# Supabase Production
DATABASE_URL=${databaseUrl}
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${answers.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${answers.supabaseServiceRoleKey}

# Application Settings
NODE_ENV=production
PORT=${answers.port}
`;

  try {
    writeFileSync(PRODUCTION_ENV_FILE, envContent, "utf8");
    console.log(`\n✅ Created ${PRODUCTION_ENV_FILE}`);

    await createSymlink();

    console.log("\n🎉 Production environment setup complete!");
    console.log("\n⚠️  IMPORTANT SECURITY REMINDERS:");
    console.log("  • .env.production contains sensitive credentials");
    console.log("  • Verify .env.production is in .gitignore");
    console.log("  • Never commit or share this file");
    console.log("  • Rotate keys if accidentally exposed");
    console.log("\nNext steps:");
    console.log("  1. Verify your Supabase connection");
    console.log("  2. Run migrations: pnpx supabase db push");
    console.log("  3. Deploy your application");
  } catch (error) {
    console.error("❌ Error creating .env.production:", error.message);
    process.exit(1);
  }
}

async function createSymlink() {
  try {
    // Remove existing symlink if it exists
    if (existsSync(ENV_SYMLINK)) {
      unlinkSync(ENV_SYMLINK);
    }

    // Create symlink from .env to .env.production
    const { symlinkSync } = await import("fs");
    symlinkSync(".env.production", ENV_SYMLINK);
    console.log("✅ Created symlink: .env -> .env.production");
  } catch (error) {
    console.error("⚠️  Could not create symlink:", error.message);
    console.log("💡 You can manually copy .env.production to .env if needed");
  }
}

setupProduction().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});