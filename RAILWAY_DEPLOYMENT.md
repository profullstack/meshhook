# Railway Deployment Guide for MeshHook

This project consists of multiple services that need to be deployed separately on Railway.

## Architecture Overview

MeshHook is a monorepo with the following services:

1. **Web Application** (SvelteKit) - User interface
2. **Orchestrator Worker** - Background job processor
3. **Database** (Supabase/PostgreSQL) - Shared data store

## Deployment Steps

### Prerequisites

- Railway account
- Supabase project (or PostgreSQL database)
- Environment variables configured

### 1. Create Railway Services

You need to create **TWO separate services** in Railway:

#### Service 1: Web Application

1. Create a new service in Railway
2. Connect your GitHub repository
3. Set the **Root Directory** to: `apps/web` (or use the config file approach below)
4. Railway will detect the SvelteKit app automatically

**Option A: Using railway.web.toml**
- In Railway service settings, set **Config File Path** to: `railway.web.toml`

**Option B: Manual Configuration**
- Build Command: `pnpm install && cd apps/web && pnpm run build`
- Start Command: `cd apps/web && node build/index.js`

#### Service 2: Orchestrator Worker

1. Create another new service in Railway
2. Connect the same GitHub repository
3. Set the **Root Directory** to root (or use the config file approach below)

**Option A: Using railway.toml**
- In Railway service settings, set **Config File Path** to: `railway.toml`

**Option B: Manual Configuration**
- Build Command: `pnpm install`
- Start Command: `node workers/orchestrator.mjs`

### 2. Environment Variables

Both services need these environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Node.js
NODE_VERSION=20
PNPM_VERSION=9
NODE_ENV=production

# Application (Web only)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ORIGIN=https://your-app.railway.app
```

### 3. Service Communication Architecture

**Important: Services do NOT communicate via HTTP with each other!**

The architecture uses **database-driven async communication**:

```
┌─────────────────┐         ┌──────────────────┐
│  Web App        │         │  Orchestrator    │
│  (Public URL)   │         │  Worker          │
│                 │         │  (No public URL) │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │    Both connect to        │
         │    same database          │
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │  PostgreSQL │
              │  + PGMQ     │
              │  (Supabase) │
              └─────────────┘
```

**How it works:**

1. **Web App** (needs public domain):
   - Serves the UI to users
   - Handles API requests
   - Writes jobs to PGMQ queue in database
   - Reads run status from database

2. **Orchestrator Worker** (no public domain needed):
   - Polls PGMQ queue for jobs
   - Processes workflow steps
   - Writes events back to database
   - Updates run status in database

3. **Communication Flow**:
   - User triggers workflow → Web app writes to `pgmq.run:orchestrate` queue
   - Worker polls queue → picks up job → processes it
   - Worker writes events to `workflow_events` table
   - Web app reads events via Supabase Realtime for live updates

**Railway Domain Assignment:**

- **Web Service**: Gets a public domain (e.g., `meshhook-web.railway.app`)
- **Worker Service**: No public domain needed (internal service only)

Both services only need the `DATABASE_URL` environment variable to communicate through the database.

### 4. Database Setup

Before deploying, ensure your database is set up:

```bash
# Run migrations locally first
pnpm run db:migrate

# Or use Supabase CLI
pnpx supabase db push --linked
```

### 5. Verify Deployment

After deployment:

1. **Web App**: Visit your Railway-provided URL
2. **Worker**: Check Railway logs for: `🧠 MeshHook Orchestrator running`
3. **Database**: Verify tables exist in Supabase dashboard

## Configuration Files

### railway.toml (Orchestrator Worker)

```toml
# Railway configuration for the Orchestrator Worker
[build]
builder = "RAILPACKS"
buildCommand = "pnpm install"

[deploy]
startCommand = "node workers/orchestrator.mjs"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_VERSION = "20"
PNPM_VERSION = "9"
```

### railway.web.toml (Web Application)

```toml
# Railway configuration for the Web Application (SvelteKit)
[build]
builder = "RAILPACKS"
buildCommand = "pnpm install && cd apps/web && pnpm run build"

[deploy]
startCommand = "cd apps/web && node build/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_VERSION = "20"
PNPM_VERSION = "9"
```

## Troubleshooting

### Web App Won't Start

- Check that `apps/web/build` directory exists after build
- Verify `ORIGIN` environment variable is set
- Check Railway logs for SvelteKit adapter errors

### Worker Won't Start

- Verify `DATABASE_URL` is set correctly
- Check that PGMQ extensions are installed in database
- Look for connection errors in Railway logs

### Both Services Can't Connect to Database

- Verify Supabase connection pooler URL is used
- Check that IP allowlist includes Railway IPs (or use `0.0.0.0/0` for testing)
- Ensure SSL mode is configured correctly

## Scaling

- **Web App**: Can be scaled horizontally (multiple instances)
- **Worker**: Can be scaled horizontally (multiple workers will process jobs in parallel)
- **Database**: Use Supabase connection pooler for high concurrency

## Monitoring

Monitor your services through:

1. Railway dashboard (logs, metrics, deployments)
2. Supabase dashboard (database performance, queries)
3. Application logs (structured logging in both services)

## Cost Optimization

- Use Railway's sleep mode for development environments
- Configure appropriate restart policies
- Monitor resource usage and adjust instance sizes