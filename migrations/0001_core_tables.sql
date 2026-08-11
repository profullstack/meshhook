-- MeshHook core tables (SQLite / libSQL).
--
-- Ported from supabase/migrations/20250110000001_create_core_tables.sql plus the
-- later column additions (…0006_add_workflow_metadata_columns). Type mapping:
--
--   uuid          -> text, default is a v4 generated in SQL (see uuid4 note below)
--   jsonb         -> text holding JSON; query with json_extract()
--   timestamptz   -> text holding ISO-8601 UTC, e.g. 2026-08-11T12:00:00.000Z
--   bytea         -> blob
--   bigserial     -> integer primary key (an alias for rowid, so it autoincrements)
--   inet          -> text
--
-- Row Level Security has no SQLite equivalent. Every policy that previously
-- lived in the database is now enforced in application code — see
-- packages/shared/lib/authz.js. Any new query that touches a project-scoped
-- table must go through those helpers or filter on owner explicitly.
--
-- The default id expression builds an RFC-4122 v4 UUID from randomblob() so that
-- inserts which omit `id` keep working the way they did under gen_random_uuid().

create table if not exists projects (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  owner text not null,
  name text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_projects_owner on projects(owner);

create trigger if not exists update_projects_updated_at
after update on projects for each row
begin
  update projects set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- Encrypted secrets vault. value_encrypted stays AES-GCM ciphertext; SQLite
-- stores it as a blob exactly as Postgres stored the bytea.
create table if not exists secrets (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  project_id text not null references projects(id) on delete cascade,
  key text not null,
  value_encrypted blob not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique(project_id, key)
);

create index if not exists idx_secrets_project_id on secrets(project_id);

create trigger if not exists update_secrets_updated_at
after update on secrets for each row
begin
  update secrets set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- Workflow definitions, versioned. `name` is not null in the Postgres schema by
-- the time migration 0006 has run, so it is declared not null here directly.
create table if not exists workflow_definitions (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  project_id text not null references projects(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  user_id text,
  version integer not null default 1,
  definition text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique(project_id, slug, version)
);

create index if not exists idx_workflow_definitions_project_id on workflow_definitions(project_id);
create index if not exists idx_workflow_definitions_slug on workflow_definitions(project_id, slug);
create index if not exists idx_workflow_definitions_status on workflow_definitions(status);
create index if not exists idx_workflow_definitions_user_id on workflow_definitions(user_id);

create trigger if not exists update_workflow_definitions_updated_at
after update on workflow_definitions for each row
begin
  update workflow_definitions set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

create table if not exists workflow_runs (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  project_id text not null references projects(id) on delete cascade,
  workflow_id text not null references workflow_definitions(id) on delete cascade,
  status text not null check (status in ('running', 'succeeded', 'failed', 'paused', 'canceled')),
  started_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_workflow_runs_project_id on workflow_runs(project_id);
create index if not exists idx_workflow_runs_workflow_id on workflow_runs(workflow_id);
create index if not exists idx_workflow_runs_status on workflow_runs(status);
create index if not exists idx_workflow_runs_project_started on workflow_runs(project_id, started_at desc);

-- Deliberately not a generic updated_at trigger: the orchestrator sets
-- finished_at and updated_at together in one statement, and a trigger firing on
-- its own update would rewrite the value it just wrote.
create trigger if not exists update_workflow_runs_updated_at
after update of status, finished_at on workflow_runs for each row
when new.updated_at = old.updated_at
begin
  update workflow_runs set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- Event-sourcing log. Under Postgres this was range-partitioned by month
-- (migration …0003). SQLite has no declarative partitioning; the equivalent
-- win comes from the (run_id, ts) index, which is what every replay query uses.
-- Retention is handled by scripts/prune-events.js rather than by dropping
-- partitions.
create table if not exists workflow_events (
  id integer primary key,
  run_id text not null references workflow_runs(id) on delete cascade,
  ts text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  type text not null,
  payload text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_workflow_events_run_id on workflow_events(run_id);
create index if not exists idx_workflow_events_run_ts on workflow_events(run_id, ts);
create index if not exists idx_workflow_events_type on workflow_events(type);
-- Supports the retention sweep, which deletes by age across all runs.
create index if not exists idx_workflow_events_ts on workflow_events(ts);

create table if not exists audit_log (
  id integer primary key,
  project_id text references projects(id) on delete cascade,
  user_id text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata text,
  ip_address text,
  user_agent text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_audit_log_project_id on audit_log(project_id);
create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);
create index if not exists idx_audit_log_action on audit_log(action);
