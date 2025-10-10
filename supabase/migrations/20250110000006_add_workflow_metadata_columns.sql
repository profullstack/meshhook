-- MeshHook Workflow Metadata Columns Migration
-- Adds name, description, and status columns to workflow_definitions table
-- Updates the workflows view to include these columns

-- ============================================================================
-- ADD METADATA COLUMNS TO WORKFLOW_DEFINITIONS
-- ============================================================================

-- Add name column (separate from slug for display purposes)
alter table workflow_definitions
add column if not exists name text;

-- Add description column for workflow documentation
alter table workflow_definitions
add column if not exists description text;

-- Add status column for workflow lifecycle management
alter table workflow_definitions
add column if not exists status text default 'draft' check (status in ('draft', 'published', 'archived'));

-- Add user_id column for user ownership (in addition to project_id)
alter table workflow_definitions
add column if not exists user_id uuid;

-- Update existing rows to have a name based on slug if name is null
update workflow_definitions
set name = slug
where name is null;

-- Make name required going forward
alter table workflow_definitions
alter column name set not null;

-- Add index for status queries
create index if not exists idx_workflow_definitions_status on workflow_definitions(status);

-- Add index for user_id queries
create index if not exists idx_workflow_definitions_user_id on workflow_definitions(user_id);

-- ============================================================================
-- UPDATE WORKFLOWS VIEW
-- ============================================================================

-- Drop and recreate the view to include new columns
drop view if exists public.workflows;

create or replace view public.workflows as
select
  id,
  project_id,
  slug,
  name,
  description,
  status,
  user_id,
  version,
  definition,
  created_at,
  updated_at
from public.workflow_definitions;

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on column workflow_definitions.name is 'Display name for the workflow (user-friendly)';
comment on column workflow_definitions.description is 'Optional description of what the workflow does';
comment on column workflow_definitions.status is 'Workflow lifecycle status: draft, published, or archived';
comment on column workflow_definitions.user_id is 'User who created/owns this workflow';

comment on view public.workflows is 'View mapping workflow_definitions to workflows with all metadata columns';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
grant select on public.workflows to authenticated;