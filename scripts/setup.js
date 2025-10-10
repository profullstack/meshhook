#!/usr/bin/env node

import inquirer from "inquirer";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const ENV_SYMLINK = join(rootDir, ".env");

// Environment configurations
const ENVIRONMENTS = {
  local: {
    name: "Local Development",
    file: ".env.local",
    defaults: {
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      supabaseUrl: "http://127.0.0.1:54321",
      supabaseAnonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      supabaseServiceRoleKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
      nodeEnv: "development",
      port: "8080",
    },
    committed: true,
  },
  staging: {
    name: "Staging",
    file: ".env.staging",
    defaults: {
      nodeEnv: "staging",
      port: "8080",
    },
    committed: false,
  },
  production: {
    name: "Production",
    file: ".env.production",
    defaults: {
      nodeEnv: "production",
      port: "8080",
    },
    committed: false,
  },
};

async function setup() {
  console.log("🔧 MeshHook Environment Setup\n");

  // Select environment
  const { environment } = await inquirer.prompt([
    {
      type: "list",
      name: "environment",
      message: "Select environment to configure:",
      choices: [
        { name: "🏠 Local Development", value: "local" },
        { name: "🧪 Staging", value: "staging" },
        { name: "🚀 Production", value: "production" },
      ],
    },
  ]);

  const config = ENVIRONMENTS[environment];
  const envFile = join(rootDir, config.file);

  console.log(`\n📝 Configuring ${config.name} environment\n`);

  if (!config.committed) {
    console.log(
      "⚠️  WARNING: This will create a file with sensitive credentials."
    );
    console.log(`⚠️  Make sure ${config.file} is in .gitignore!\n`);
  }

  // Check if file already exists
  if (existsSync(envFile)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `${config.file} already exists. Overwrite it?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(`✅ Keeping existing ${config.file}`);
      await createSymlink(config.file);
      return;
    }
  }

  let answers;

  if (environment === "local") {
    // Local development - use defaults or customize
    const { useDefaults } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useDefaults",
        message: "Use default local development settings?",
        default: true,
      },
    ]);

    if (useDefaults) {
      answers = config.defaults;
    } else {
      answers = await promptForConfig(environment, config.defaults);
    }
  } else {
    // Staging/Production - require Supabase credentials
    answers = await promptForProductionConfig(environment, config.defaults);
  }

  const envContent = generateEnvContent(environment, config, answers);

  try {
    writeFileSync(envFile, envContent, "utf8");
    console.log(`\n✅ Created ${config.file}`);

    await createSymlink(config.file);

    console.log(`\n🎉 ${config.name} environment setup complete!`);

    if (!config.committed) {
      console.log("\n⚠️  IMPORTANT SECURITY REMINDERS:");
      console.log(`  • ${config.file} contains sensitive credentials`);
      console.log(`  • Verify ${config.file} is in .gitignore`);
      console.log("  • Never commit or share this file");
      console.log("  • Rotate keys if accidentally exposed");
    }

    console.log("\nNext steps:");
    if (environment === "local") {
      console.log("  1. Run: pnpx supabase start");
      console.log("  2. Run: pnpm run db:migrate");
      console.log("  3. Run: pnpm run dev");
    } else {
      console.log("  1. Run: pnpm run db:migrate");
      console.log("  2. Deploy your application");
    }
  } catch (error) {
    console.error(`❌ Error creating ${config.file}:`, error.message);
    process.exit(1);
  }
}

async function promptForConfig(environment, defaults) {
  return await inquirer.prompt([
    {
      type: "input",
      name: "databaseUrl",
      message: "PostgreSQL connection string:",
      default: defaults.databaseUrl,
      validate: (input) =>
        input.startsWith("postgresql://") || "Must be a valid PostgreSQL URL",
    },
    {
      type: "input",
      name: "supabaseUrl",
      message: "Supabase API URL:",
      default: defaults.supabaseUrl,
      validate: (input) => input.startsWith("http") || "Must be a valid URL",
    },
    {
      type: "input",
      name: "supabaseAnonKey",
      message: "Supabase Anon Key:",
      default: defaults.supabaseAnonKey,
    },
    {
      type: "input",
      name: "supabaseServiceRoleKey",
      message: "Supabase Service Role Key:",
      default: defaults.supabaseServiceRoleKey,
    },
    {
      type: "input",
      name: "port",
      message: "Application port:",
      default: defaults.port,
      validate: (input) => {
        const port = parseInt(input);
        return (
          (!isNaN(port) && port > 0 && port < 65536) ||
          "Must be a valid port number"
        );
      },
    },
  ]);
}

async function promptForProductionConfig(environment, defaults) {
  console.log("Enter your Supabase project credentials:");
  console.log("(Find these in your Supabase project dashboard)\n");

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
      default: defaults.port,
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
  answers.databaseUrl = `postgresql://postgres:${answers.dbPassword}@db.${answers.projectRef}.supabase.co:5432/postgres`;
  answers.supabaseUrl = `https://${answers.projectRef}.supabase.co`;

  return answers;
}

function generateEnvContent(environment, config, answers) {
  const isLocal = environment === "local";
  const header = isLocal
    ? `# Local Development Environment Variables
# This file is committed to GitHub for easy local setup
# DO NOT put production secrets here!`
    : `# ${config.name} Environment Variables
# NEVER commit this file to version control!
# This file contains sensitive ${environment} credentials`;

  return `${header}

# Supabase ${config.name}
DATABASE_URL=${answers.databaseUrl}
SUPABASE_URL=${answers.supabaseUrl}
SUPABASE_ANON_KEY=${answers.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${answers.supabaseServiceRoleKey}

# Application Settings
NODE_ENV=${config.defaults.nodeEnv}
PORT=${answers.port}
`;
}

async function createSymlink(targetFile) {
  try {
    // Remove existing symlink if it exists
    if (existsSync(ENV_SYMLINK)) {
      unlinkSync(ENV_SYMLINK);
    }

    // Create symlink from .env to target file
    const { symlinkSync } = await import("fs");
    symlinkSync(targetFile, ENV_SYMLINK);
    console.log(`✅ Created symlink: .env -> ${targetFile}`);
  } catch (error) {
    console.error("⚠️  Could not create symlink:", error.message);
    console.log(`💡 You can manually copy ${targetFile} to .env if needed`);
  }
}

setup().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});