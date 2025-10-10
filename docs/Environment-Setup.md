# Environment Setup Guide

This guide explains how to set up your development and production environments for the MeshHook project.

## Overview

The project uses two separate environment configurations:

- **`.env.local`** - Local development (committed to GitHub)
- **`.env`** - Production (NOT committed, in `.gitignore`)

## Local Development Setup

### Prerequisites

- Node.js v20 or newer
- pnpm package manager
- Supabase CLI

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meshhook
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run the interactive setup**
   ```bash
   pnpm run setup
   ```
   
   Select "Local Development" when prompted. This will:
   - Prompt you for local configuration (or use defaults)
   - Create `.env.local` with your settings
   - Create a symlink from `.env` to `.env.local`
   
   **OR** use the pre-configured `.env.local`:
   
   The `.env.local` file is already committed with local Supabase defaults:
   - Local PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
   - Local Supabase API: `http://127.0.0.1:54321`
   - Default anon and service role keys for local development
   - Default port: 8080

4. **Start Supabase locally**
   ```bash
   pnpx supabase start
   ```

   This will start:
   - PostgreSQL database on port 54322
   - Supabase API on port 54321
   - Supabase Studio on port 54323

5. **Run migrations**
   ```bash
   pnpm run db:migrate
   ```

6. **Start the application**
   ```bash
   pnpm run dev
   ```

## Production Setup

### Prerequisites

- A Supabase project (create at [supabase.com](https://supabase.com))
- Production server or hosting platform

### Steps

1. **Run the interactive setup**
   ```bash
   pnpm run setup
   ```
   
   Select "Production" (or "Staging") when prompted. This will:
   - Prompt you for your Supabase project credentials
   - Create `.env.production` (or `.env.staging`) with your settings
   - Create a symlink from `.env` to the selected environment file
   - Display security reminders
   
   **OR** manually configure:

2. **Manual configuration (alternative)**
   
   Copy the template:
   ```bash
   cp .env.example .env.production
   ```
   
   Edit `.env.production` and replace placeholders with your actual Supabase project values.
   Default port is 8080 (can be overridden with PORT environment variable).

3. **Find your Supabase credentials**
   
   In your Supabase project dashboard:
   - Go to **Settings** → **API**
   - Copy the **Project URL** (SUPABASE_URL)
   - Copy the **anon/public** key (SUPABASE_ANON_KEY)
   - Copy the **service_role** key (SUPABASE_SERVICE_ROLE_KEY)
   
   For DATABASE_URL:
   - Go to **Settings** → **Database**
   - Copy the **Connection string** (URI format)

4. **Deploy migrations**
   ```bash
   pnpm run db:migrate
   ```
   
   The script automatically detects your environment from the `.env` symlink.

5. **Deploy your application**
   
   Follow your hosting platform's deployment instructions.

## Environment Variable Reference

### Required Variables

| Variable | Description | Local Default | Production |
|----------|-------------|---------------|------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Your Supabase DB URL |
| `SUPABASE_URL` | Supabase API URL | `http://127.0.0.1:54321` | Your project URL |
| `SUPABASE_ANON_KEY` | Public/anonymous key | Local default key | Your project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) | Local default key | Your project service key |
| `PORT` | Application port | `8080` | `8080` (configurable) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` / `staging` / `production` |

## Available Scripts

### Setup Command

```bash
# Interactive environment setup (local/staging/production)
pnpm run setup
```

This unified command will:
- Prompt you to select an environment (Local, Staging, or Production)
- Guide you through configuration for the selected environment
- Create the appropriate `.env.*` file
- Create a symlink from `.env` to your selected environment file

### Database Migration Command

```bash
# Run migrations (auto-detects environment from .env symlink)
pnpm run db:migrate
```

This unified command will:
- Detect your current environment from the `.env` symlink
- For local: Run `pnpx supabase db reset` (resets and re-runs all migrations)
- For staging/production: Run `pnpx supabase db push` (pushes new migrations)

## Supabase CLI Commands

### Local Development

```bash
# Start local Supabase
pnpx supabase start

# Stop local Supabase
pnpx supabase stop

# Reset database (drops all data and re-runs migrations)
pnpx supabase db reset
# Or use: pnpm run db:migrate (when .env points to .env.local)

# Create a new migration
pnpx supabase migration new <migration_name>
# Note: This command will hang - just kill it (Ctrl+C). The file will be created.

# View migration status
pnpx supabase migration list
```

### Production

```bash
# Link to your Supabase project
pnpx supabase link --project-ref <your-project-ref>

# Push migrations to production
pnpx supabase db push
# Or use: pnpm run db:migrate (when .env points to .env.production)

# Pull remote schema changes
pnpx supabase db pull
```

## Troubleshooting

### Database connection fails

**Local:**
- Ensure Supabase is running: `pnpx supabase status`
- Check if port 54322 is available
- Restart Supabase: `pnpx supabase stop && pnpx supabase start`

**Production:**
- Verify your `.env` file has correct credentials
- Check if your IP is whitelisted in Supabase dashboard
- Ensure DATABASE_URL includes the correct password

### Environment variables not loading

- Ensure you're in the project root directory
- Check file names: `.env.local` for development, `.env` for production
- Verify `.env` is in `.gitignore` (production only)
- Restart your application after changing environment variables

### Migration conflicts

- Never modify existing migration files
- Always create new migrations: `pnpx supabase migration new <name>`
- If you have conflicts, reset local DB: `pnpx supabase db reset`

## Security Best Practices

1. **Never commit production secrets to version control**
   - `.env` and `.env.production` are in `.gitignore` by default
   - These files contain production secrets

2. **`.env.local` is safe to commit**
   - Contains only local development defaults
   - No production secrets
   - Committed to repo for easy team setup

3. **Use the setup script**
   - `pnpm run setup` for any environment
   - Select your target environment when prompted
   - Script creates proper symlinks automatically

4. **Rotate keys regularly**
   - Especially if accidentally exposed
   - Can be done in Supabase dashboard

5. **Use service role key carefully**
   - Has admin privileges
   - Only use server-side
   - Never expose to client

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Environment Variables Best Practices](https://12factor.net/config)