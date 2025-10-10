-- MeshHook RLS Policies Migration
-- Issue #86: Implement Row Level Security (RLS) policies
-- This migration enables RLS and creates policies for multi-tenant data isolation

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
alter table projects enable row level security;
alter table secrets enable row level security;
alter table workflow_definitions enable row level security;
alter table workflow_runs enable row level security;
alter table workflow_events enable row level security;
alter table audit_log enable row level security;

-- ============================================================================
-- HELPER FUNCTION: Get user's accessible project IDs
-- ============================================================================

-- This function returns all project IDs that the current user has access to
-- Currently returns projects owned by the user, but can be extended for team access
create or replace function user_project_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select id from projects where owner = auth.uid();
$$;

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Users can view their own projects
create policy "Users can view own projects"
  on projects
  for select
  using (owner = auth.uid());

-- Users can insert their own projects
create policy "Users can create own projects"
  on projects
  for insert
  with check (owner = auth.uid());

-- Users can update their own projects
create policy "Users can update own projects"
  on projects
  for update
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Users can delete their own projects
create policy "Users can delete own projects"
  on projects
  for delete
  using (owner = auth.uid());

-- ============================================================================
-- SECRETS TABLE POLICIES
-- ============================================================================

-- Users can view secrets in their projects
create policy "Users can view secrets in own projects"
  on secrets
  for select
  using (project_id in (select user_project_ids()));

-- Users can insert secrets in their projects
create policy "Users can create secrets in own projects"
  on secrets
  for insert
  with check (project_id in (select user_project_ids()));

-- Users can update secrets in their projects
create policy "Users can update secrets in own projects"
  on secrets
  for update
  using (project_id in (select user_project_ids()))
  with check (project_id in (select user_project_ids()));

-- Users can delete secrets in their projects
create policy "Users can delete secrets in own projects"
  on secrets
  for delete
  using (project_id in (select user_project_ids()));

-- ============================================================================
-- WORKFLOW_DEFINITIONS TABLE POLICIES
-- ============================================================================

-- Users can view workflow definitions in their projects
create policy "Users can view workflow definitions in own projects"
  on workflow_definitions
  for select
  using (project_id in (select user_project_ids()));

-- Users can insert workflow definitions in their projects
create policy "Users can create workflow definitions in own projects"
  on workflow_definitions
  for insert
  with check (project_id in (select user_project_ids()));

-- Users can update workflow definitions in their projects
create policy "Users can update workflow definitions in own projects"
  on workflow_definitions
  for update
  using (project_id in (select user_project_ids()))
  with check (project_id in (select user_project_ids()));

-- Users can delete workflow definitions in their projects
create policy "Users can delete workflow definitions in own projects"
  on workflow_definitions
  for delete
  using (project_id in (select user_project_ids()));

-- ============================================================================
-- WORKFLOW_RUNS TABLE POLICIES
-- ============================================================================

-- Users can view workflow runs in their projects
create policy "Users can view workflow runs in own projects"
  on workflow_runs
  for select
  using (project_id in (select user_project_ids()));

-- Users can insert workflow runs in their projects
create policy "Users can create workflow runs in own projects"
  on workflow_runs
  for insert
  with check (project_id in (select user_project_ids()));

-- Users can update workflow runs in their projects
create policy "Users can update workflow runs in own projects"
  on workflow_runs
  for update
  using (project_id in (select user_project_ids()))
  with check (project_id in (select user_project_ids()));

-- Users can delete workflow runs in their projects
create policy "Users can delete workflow runs in own projects"
  on workflow_runs
  for delete
  using (project_id in (select user_project_ids()));

-- ============================================================================
-- WORKFLOW_EVENTS TABLE POLICIES
-- ============================================================================

-- Users can view workflow events for runs in their projects
-- Note: workflow_events doesn't have project_id, so we join through workflow_runs
create policy "Users can view workflow events in own projects"
  on workflow_events
  for select
  using (
    run_id in (
      select id from workflow_runs
      where project_id in (select user_project_ids())
    )
  );

-- Users can insert workflow events for runs in their projects
create policy "Users can create workflow events in own projects"
  on workflow_events
  for insert
  with check (
    run_id in (
      select id from workflow_runs
      where project_id in (select user_project_ids())
    )
  );

-- Users can update workflow events for runs in their projects
create policy "Users can update workflow events in own projects"
  on workflow_events
  for update
  using (
    run_id in (
      select id from workflow_runs
      where project_id in (select user_project_ids())
    )
  )
  with check (
    run_id in (
      select id from workflow_runs
      where project_id in (select user_project_ids())
    )
  );

-- Users can delete workflow events for runs in their projects
create policy "Users can delete workflow events in own projects"
  on workflow_events
  for delete
  using (
    run_id in (
      select id from workflow_runs
      where project_id in (select user_project_ids())
    )
  );

-- ============================================================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================================================

-- Users can view audit logs for their projects
-- Note: audit_log.project_id can be null for system-level actions
create policy "Users can view audit logs in own projects"
  on audit_log
  for select
  using (
    project_id in (select user_project_ids())
    or user_id = auth.uid()
  );

-- Users can insert audit logs for their projects
create policy "Users can create audit logs in own projects"
  on audit_log
  for insert
  with check (
    project_id in (select user_project_ids())
    or user_id = auth.uid()
  );

-- Note: Audit logs should generally not be updated or deleted
-- If needed, add policies with appropriate restrictions

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on function user_project_ids() is 'Returns all project IDs accessible by the current authenticated user';

comment on policy "Users can view own projects" on projects is 'Allow users to view projects they own';
comment on policy "Users can create own projects" on projects is 'Allow users to create projects with themselves as owner';
comment on policy "Users can update own projects" on projects is 'Allow users to update projects they own';
comment on policy "Users can delete own projects" on projects is 'Allow users to delete projects they own';

comment on policy "Users can view secrets in own projects" on secrets is 'Allow users to view secrets in their projects';
comment on policy "Users can create secrets in own projects" on secrets is 'Allow users to create secrets in their projects';
comment on policy "Users can update secrets in own projects" on secrets is 'Allow users to update secrets in their projects';
comment on policy "Users can delete secrets in own projects" on secrets is 'Allow users to delete secrets in their projects';

comment on policy "Users can view workflow definitions in own projects" on workflow_definitions is 'Allow users to view workflow definitions in their projects';
comment on policy "Users can create workflow definitions in own projects" on workflow_definitions is 'Allow users to create workflow definitions in their projects';
comment on policy "Users can update workflow definitions in own projects" on workflow_definitions is 'Allow users to update workflow definitions in their projects';
comment on policy "Users can delete workflow definitions in own projects" on workflow_definitions is 'Allow users to delete workflow definitions in their projects';

comment on policy "Users can view workflow runs in own projects" on workflow_runs is 'Allow users to view workflow runs in their projects';
comment on policy "Users can create workflow runs in own projects" on workflow_runs is 'Allow users to create workflow runs in their projects';
comment on policy "Users can update workflow runs in own projects" on workflow_runs is 'Allow users to update workflow runs in their projects';
comment on policy "Users can delete workflow runs in own projects" on workflow_runs is 'Allow users to delete workflow runs in their projects';

comment on policy "Users can view workflow events in own projects" on workflow_events is 'Allow users to view workflow events for runs in their projects';
comment on policy "Users can create workflow events in own projects" on workflow_events is 'Allow users to create workflow events for runs in their projects';
comment on policy "Users can update workflow events in own projects" on workflow_events is 'Allow users to update workflow events for runs in their projects';
comment on policy "Users can delete workflow events in own projects" on workflow_events is 'Allow users to delete workflow events for runs in their projects';

comment on policy "Users can view audit logs in own projects" on audit_log is 'Allow users to view audit logs for their projects or their own actions';
comment on policy "Users can create audit logs in own projects" on audit_log is 'Allow users to create audit logs for their projects or their own actions';