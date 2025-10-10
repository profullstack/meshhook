-- MeshHook core tables (simplified)
create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists secrets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  value_encrypted bytea not null,
  created_at timestamptz default now()
);

create table if not exists workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  slug text not null,
  version int not null,
  definition jsonb not null,
  created_at timestamptz default now(),
  unique(project_id, slug, version)
);

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workflow_id uuid not null references workflow_definitions(id) on delete cascade,
  status text not null check (status in ('running','succeeded','failed','paused','canceled')),
  started_at timestamptz default now(),
  finished_at timestamptz
);

create table if not exists workflow_events (
  id bigserial primary key,
  run_id uuid not null references workflow_runs(id) on delete cascade,
  ts timestamptz default now(),
  type text not null,
  payload jsonb not null
);

create index if not exists idx_events_run_ts on workflow_events (run_id, ts);
create index if not exists idx_runs_project_start on workflow_runs (project_id, started_at desc);
