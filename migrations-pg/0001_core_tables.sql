-- MeshHook core tables, Postgres.
--
-- Generated from migrations/0001_core_tables.sql with `npx libsql-pg
-- convert-schema`, then reviewed and hand-fixed. Applied by scripts/db-migrate.js
-- when DATABASE_URL is postgres:// (the only URL the app accepts now).
--
-- Decisions, so the SQLite files and the app's queries keep working unchanged:
--
--   * Every timestamp column stays TEXT holding ISO-8601 UTC, exactly the value
--     the app writes (new Date().toISOString()) and compares. The SQLite
--     default strftime('%Y-%m-%dT%H:%M:%fZ', 'now') becomes meshhook_now_iso(),
--     which produces the same 24-character string, and the libsql-pg rewriter
--     turns the app's inline strftime(...) into the same to_char() expression.
--     Promoting the columns to timestamptz (what the converter suggested) would
--     break every `set updated_at = strftime(...)` the app issues, because
--     Postgres will not assign text to a timestamptz column.
--   * uuid ids default to gen_random_uuid()::text (Postgres 13+). The SQLite
--     randomblob()/random() expression the converter carried over does not run
--     on Postgres (random() is a double there, so `% 4` has no operator).
--   * `integer primary key` (a rowid alias) becomes an identity bigint, so
--     lastInsertRowid keeps working through libsql-pg (it appends RETURNING).
--   * The AFTER UPDATE triggers become one BEFORE UPDATE trigger function.
--   * 0/1 flag columns stay bigint with their CHECK (the app compares = 1).

create extension if not exists pgcrypto;

-- The stored timestamp format: 2026-08-11T12:00:00.000Z.
create or replace function meshhook_now_iso() returns text
language sql stable as $$
  select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- Replaces the per-table AFTER UPDATE triggers: stamp updated_at on the row
-- being written. workflow_runs adds a WHEN guard below so a statement that sets
-- updated_at itself is left alone (the orchestrator sets finished_at and
-- updated_at together).
create or replace function meshhook_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := meshhook_now_iso();
  return new;
end
$$;

create table if not exists projects (
  id text primary key default (gen_random_uuid()::text),
  owner text not null,
  name text not null,
  created_at text not null default (meshhook_now_iso()),
  updated_at text not null default (meshhook_now_iso())
);

create index if not exists idx_projects_owner on projects(owner);

drop trigger if exists update_projects_updated_at on projects;
create trigger update_projects_updated_at
before update on projects for each row
execute function meshhook_set_updated_at();

-- Encrypted secrets vault. value_encrypted is AES-GCM ciphertext, bytea.
create table if not exists secrets (
  id text primary key default (gen_random_uuid()::text),
  project_id text not null references projects(id) on delete cascade,
  "key" text not null,
  value_encrypted bytea not null,
  created_at text not null default (meshhook_now_iso()),
  updated_at text not null default (meshhook_now_iso()),
  unique(project_id, "key")
);

create index if not exists idx_secrets_project_id on secrets(project_id);

drop trigger if exists update_secrets_updated_at on secrets;
create trigger update_secrets_updated_at
before update on secrets for each row
execute function meshhook_set_updated_at();

create table if not exists workflow_definitions (
  id text primary key default (gen_random_uuid()::text),
  project_id text not null references projects(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  user_id text,
  version bigint not null default 1,
  definition text not null,
  created_at text not null default (meshhook_now_iso()),
  updated_at text not null default (meshhook_now_iso()),
  unique(project_id, slug, version)
);

create index if not exists idx_workflow_definitions_project_id on workflow_definitions(project_id);
create index if not exists idx_workflow_definitions_slug on workflow_definitions(project_id, slug);
create index if not exists idx_workflow_definitions_status on workflow_definitions(status);
create index if not exists idx_workflow_definitions_user_id on workflow_definitions(user_id);

drop trigger if exists update_workflow_definitions_updated_at on workflow_definitions;
create trigger update_workflow_definitions_updated_at
before update on workflow_definitions for each row
execute function meshhook_set_updated_at();

create table if not exists workflow_runs (
  id text primary key default (gen_random_uuid()::text),
  project_id text not null references projects(id) on delete cascade,
  workflow_id text not null references workflow_definitions(id) on delete cascade,
  status text not null check (status in ('running', 'succeeded', 'failed', 'paused', 'canceled')),
  started_at text not null default (meshhook_now_iso()),
  finished_at text,
  created_at text not null default (meshhook_now_iso()),
  updated_at text not null default (meshhook_now_iso())
);

create index if not exists idx_workflow_runs_project_id on workflow_runs(project_id);
create index if not exists idx_workflow_runs_workflow_id on workflow_runs(workflow_id);
create index if not exists idx_workflow_runs_status on workflow_runs(status);
create index if not exists idx_workflow_runs_project_started on workflow_runs(project_id, started_at desc);

-- Deliberately guarded: the orchestrator sets finished_at and updated_at in one
-- statement, and the trigger must not rewrite the value it just wrote.
drop trigger if exists update_workflow_runs_updated_at on workflow_runs;
create trigger update_workflow_runs_updated_at
before update of status, finished_at on workflow_runs for each row
when (new.updated_at is not distinct from old.updated_at)
execute function meshhook_set_updated_at();

-- Event-sourcing log. The (run_id, ts) index is what every replay query uses;
-- retention is scripts/prune-events.js.
create table if not exists workflow_events (
  id bigint generated by default as identity primary key,
  run_id text not null references workflow_runs(id) on delete cascade,
  ts text not null default (meshhook_now_iso()),
  type text not null,
  payload text not null,
  created_at text not null default (meshhook_now_iso())
);

create index if not exists idx_workflow_events_run_id on workflow_events(run_id);
create index if not exists idx_workflow_events_run_ts on workflow_events(run_id, ts);
create index if not exists idx_workflow_events_type on workflow_events(type);
create index if not exists idx_workflow_events_ts on workflow_events(ts);

create table if not exists audit_log (
  id bigint generated by default as identity primary key,
  project_id text references projects(id) on delete cascade,
  user_id text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata text,
  ip_address text,
  user_agent text,
  created_at text not null default (meshhook_now_iso())
);

create index if not exists idx_audit_log_project_id on audit_log(project_id);
create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);
create index if not exists idx_audit_log_action on audit_log(action);
