# Architecture

See PlantUML diagrams in `./diagrams`:
- `architecture.puml` — high-level components
- `sequence_run.puml` — inbound webhook to durable run
- `data_model.puml` — core tables and relations

## Components
- **SvelteKit (SSR/API)**: webhook intake, workflow CRUD, publish versions, run console.
- **Supabase**: Postgres (data + queues), Realtime (log streaming), Storage (artifacts), Edge (cron/timers).
- **Workers**: Orchestrator (state machine + scheduling) and HTTP Executor (robust HTTP with retries/backoff).

## Determinism
- Transforms are pure (JMESPath).
- All time/uuid and HTTP responses recorded as events for replay safety.

## Queueing
- Use **pg-boss** or **pgmq** for Postgres-based durable queues with scheduled jobs.
