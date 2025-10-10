-- MeshHook Core Tables Migration
-- Issue #78: Create core tables migration
-- This migration creates the foundational tables for the MeshHook workflow engine

-- Enable required extensions
create extension if not exists pgcrypto;

-- ============================================================================
-- PROJECTS TABLE
-- Multi-tenant project isolation
-- ============================================================================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add index for owner lookups
create index if not exists idx_projects_owner on projects(owner);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_projects_updated_at
  before update on projects
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- SECRETS TABLE
-- Encrypted secrets vault for workflow credentials
-- ============================================================================
create table if not exists secrets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  value_encrypted bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, key)
);

-- Add index for project_id lookups
create index if not exists idx_secrets_project_id on secrets(project_id);

-- Add trigger to update updated_at timestamp
create trigger update_secrets_updated_at
  before update on secrets
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- WORKFLOW_DEFINITIONS TABLE
-- Workflow definitions with versioning support
-- ============================================================================
create table if not exists workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  slug text not null,
  version int not null default 1,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, slug, version)
);

-- Add indices for common queries
create index if not exists idx_workflow_definitions_project_id on workflow_definitions(project_id);
create index if not exists idx_workflow_definitions_slug on workflow_definitions(project_id, slug);

-- Add trigger to update updated_at timestamp
create trigger update_workflow_definitions_updated_at
  before update on workflow_definitions
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- WORKFLOW_RUNS TABLE
-- Workflow execution instances with status tracking
-- ============================================================================
create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workflow_id uuid not null references workflow_definitions(id) on delete cascade,
  status text not null check (status in ('running', 'succeeded', 'failed', 'paused', 'canceled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add indices for hot paths
create index if not exists idx_workflow_runs_project_id on workflow_runs(project_id);
create index if not exists idx_workflow_runs_workflow_id on workflow_runs(workflow_id);
create index if not exists idx_workflow_runs_status on workflow_runs(status);
create index if not exists idx_workflow_runs_project_started on workflow_runs(project_id, started_at desc);

-- Add trigger to update updated_at timestamp
create trigger update_workflow_runs_updated_at
  before update on workflow_runs
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- WORKFLOW_EVENTS TABLE
-- Event sourcing log for deterministic replay
-- Note: This table will be partitioned in a separate migration (#88)
-- ============================================================================
create table if not exists workflow_events (
  id bigserial primary key,
  run_id uuid not null references workflow_runs(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Add indices for event queries
create index if not exists idx_workflow_events_run_id on workflow_events(run_id);
create index if not exists idx_workflow_events_run_ts on workflow_events(run_id, ts);
create index if not exists idx_workflow_events_type on workflow_events(type);

-- ============================================================================
-- AUDIT_LOG TABLE
-- Admin actions and secret access tracking
-- ============================================================================
create table if not exists audit_log (
  id bigserial primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Add indices for audit queries
create index if not exists idx_audit_log_project_id on audit_log(project_id);
create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);
create index if not exists idx_audit_log_action on audit_log(action);

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table projects is 'Multi-tenant project isolation - each project is a separate workspace';
comment on table secrets is 'Encrypted secrets vault for storing workflow credentials and API keys';
comment on table workflow_definitions is 'Workflow definitions with versioning - immutable once published';
comment on table workflow_runs is 'Workflow execution instances with status tracking';
comment on table workflow_events is 'Event sourcing log for deterministic replay of workflow runs';
comment on table audit_log is 'Audit log for admin actions and secret access tracking';

comment on column projects.owner is 'User ID of the project owner (references auth.users)';
comment on column secrets.value_encrypted is 'AES-GCM encrypted secret value';
comment on column workflow_definitions.definition is 'JSONB workflow definition (DAG structure)';
comment on column workflow_runs.status is 'Current status: running, succeeded, failed, paused, or canceled';
comment on column workflow_events.payload is 'Event payload containing state changes and execution data';