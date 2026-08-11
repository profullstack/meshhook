# MeshHook — Mesh your webhooks. Orchestrate everything.

**MeshHook** is an MIT-licensed, webhook-first workflow engine with a visual builder (SvelteKit/Svelte 5) and Temporal-like durability via **event sourcing on SQLite (Turso)**.

## Stack
- **UI/API**: SvelteKit (Svelte 5)
- **Database**: Turso (libSQL/SQLite) — embeddable locally, replicated in production
- **Workers**: Node.js (or Bun), stateless
- **Queue**: SQLite-backed, with visibility timeouts and a dead-letter queue
- **Auth**: self-hosted sessions (scrypt password hashing, opaque session tokens)
- **Live logs**: Server-Sent Events
- **Transforms**: JMESPath
## Why MeshHook?

| Feature | n8n | Windmill | Temporal | MeshHook |
|---------|-----|----------|----------|----------|
| **License** | Fair-code (restrictive) | AGPLv3 | MIT | **MIT** |
| **Primary Use Case** | No-code automation | Script orchestration | Microservice workflows | **Webhook-first workflows** |
| **Durability** | Database polling | Database + queues | Custom event sourcing | **Event sourcing on SQLite** |
| **Visual Builder** | ✅ Drag-and-drop | ❌ Code-first | ❌ Code-first | **✅ Visual + Code** |
| **Webhook-Native** | ⚠️ Supported | ⚠️ Supported | ❌ Not primary | **✅ Built-in** |
| **Self-Hosted** | ✅ Yes | ✅ Yes | ✅ Yes | **✅ Yes** |
| **Database** | MySQL/Postgres | Postgres | Custom | **SQLite (Turso)** |
| **Transforms** | JavaScript | TypeScript/Python | Any language | **JMESPath** |
| **Realtime Logs** | ❌ Polling | ❌ Polling | ❌ Polling | **✅ Server-Sent Events** |
| **Deployment** | Complex (multiple services) | Complex (workers + API) | Complex (server + workers) | **Simple (single service)** |
| **Learning Curve** | Low (no-code) | Medium (scripts) | High (SDK required) | **Low (visual + simple)** |

### MeshHook's Sweet Spot
- **Webhook-first**: Built specifically for webhook orchestration and transformation
- **Simple deployment**: Single service on one port, no complex infrastructure
- **MIT licensed**: Truly open source, use anywhere without restrictions
- **Event sourcing**: Temporal-like durability without the complexity
- **Visual + Code**: Low-code visual builder with JMESPath for power users
- **No infrastructure**: local development is a single SQLite file — no server, no containers


## Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup environment** (interactive)
   ```bash
   pnpm run setup
   ```
   Select "Local Development" when prompted. This creates `.env.local` pointing at a
   local SQLite file (`file:./meshhook.db`) and generates a secrets encryption key.

   There is no database server to start — the file is created by the migration step.

3. **Run migrations**
   ```bash
   pnpm run db:migrate
   ```

4. **Start the orchestrator**
   ```bash
   pnpm run start
   ```
   Runs on port 8080 (configurable via PORT environment variable)

### Production / Staging

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup environment** (interactive)
   ```bash
   pnpm run setup
   ```
   Select "Production" or "Staging" and enter your Turso database URL and auth token.
   Create them first with the Turso CLI:
   ```bash
   turso db create meshhook
   turso db show meshhook --url
   turso db tokens create meshhook
   ```

3. **Run migrations**
   ```bash
   pnpm run db:migrate
   ```
   Applies any pending migrations from `migrations/` and records them in
   `schema_migrations`. Re-running is a no-op.

4. **Start the server**
   ```bash
   pnpm run start
   ```
   Runs on port 8080 by default. Configure your reverse proxy to forward traffic to this port.

## Available Commands

- `pnpm run setup` - Interactive environment configuration (local/staging/production)
- `pnpm run db:migrate` - Apply pending database migrations
- `pnpm run db:status` - Show applied and pending migrations
- `pnpm run db:verify` - Verify the schema matches what the app expects
- `pnpm test` - Run the test suite
- `pnpm run start` - Start the orchestrator worker (production)
- `pnpm mh --help` - CLI help

## Environment Files

- `.env.local` - Local development (committed to repo with safe defaults)
- `.env.staging` - Staging environment (not committed)
- `.env.production` - Production environment (not committed)
- `.env` - Symlink to active environment (created by setup script)

## Documentation

- [`./docs/Environment-Setup.md`](./docs/Environment-Setup.md) - Detailed environment setup guide
- [`./docs/Turso-Migration.md`](./docs/Turso-Migration.md) - What changed in the move off Supabase
- [`./docs/PRD.md`](./docs/PRD.md) - Product requirements
- [`./docs/Architecture.md`](./docs/Architecture.md) - System architecture
- [`./docs/diagrams/*.puml`](./docs/diagrams/) - PlantUML diagrams

## Architecture

MeshHook runs as a single service on port 8080 that handles:
- Webhook intake and processing
- Workflow orchestration
- Background job execution
- HTTP request execution with retries

All components communicate through the Turso database - no inter-service HTTP calls needed.
