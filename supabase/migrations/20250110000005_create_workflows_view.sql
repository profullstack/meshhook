-- MeshHook Workflows View Migration
-- Creates a view to map 'workflows' to 'workflow_definitions' for backward compatibility
-- This resolves the error: "Could not find the table 'public.workflows' in the schema cache"

-- ============================================================================
-- CREATE WORKFLOWS VIEW
-- ============================================================================

-- Create a view that presents workflow_definitions as 'workflows'
-- This provides a simpler interface for the application layer
create or replace view public.workflows as
select
  id,
  project_id,
  slug,
  version,
  definition,
  created_at,
  updated_at
from public.workflow_definitions;

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on view public.workflows is 'View mapping workflow_definitions to workflows for simpler application interface';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
grant select on public.workflows to authenticated;