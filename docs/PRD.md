# MeshHook — PRD

**Owner:** Anthony Ettinger (Profullstack)  
**License:** MIT

## 1. Problem
Teams want n8n’s visual simplicity and Temporal’s durability without restrictive licensing and heavyweight infra. MeshHook delivers a webhook-first, deterministic, Postgres-native workflow engine that’s easy to host and scale.

## 2. Goals (v1)
- Webhook triggers with signature verification (HMAC/JWT).
- Visual DAG builder (SvelteKit/Svelte 5).
- Nodes: `transform (JMESPath)`, `http_call` (retries/backoff), `branch`, `delay`, `terminate`.
- Durable, replayable runs via event sourcing in Postgres.
- Live logs via Supabase Realtime.
- Secrets vault (project-scoped) with masking.
- Multi-tenant RLS.

## 3. Non-Goals (v1)
- Arbitrary code execution inside nodes.
- OAuth marketplace or vendor SDK lock-in.
- Non-HTTP transports.

## 4. Users
Indie builders, automation engineers, platform teams, regulated ops needing auditability.

## 5. UX
- DAG editor, JSON Schema-driven node forms.
- Mapping preview: **Sample payload → JMESPath → Preview**.
- Test run and “resume from step”.
- Versioning: Draft → Publish vN (immutable).

## 6. Functional
- **Triggers**: `webhook` (v1), `timer` (v2).
- **Execution**: event-sourced, deterministic transforms, retries (exp+jitter), idempotency keys, timeouts, circuit breakers, DLQ & replay.
- **Storage**: definitions, runs, events, secrets, artifacts (redacted).
- **Observability**: live logs, metrics matviews, failure alerts.

## 7. Security
- RLS by `project_id`.
- Secrets AES-GCM with KEK rotation.
- Audit log for admin actions & secret access.
- PII redaction rules.

## 8. Performance
- Stateless workers; pg-boss/pgmq queue.
- Event partitions, hot-path indices, token-bucket rate limiter.

## 9. Acceptance
- Publish workflow; accept webhook; run completes with deterministic state.
- Retries on 500/timeouts; success before max attempts.
- Live logs visible; secrets never leak to UI artifacts.

## 10. Roadmap
See `./Roadmap.md`.
