-- MeshHook Workflows View RLS Fix
-- Fixes security issue where workflows view doesn't enforce RLS policies
-- This ensures users can only see workflows in their own projects

-- ============================================================================
-- DROP AND RECREATE WORKFLOWS VIEW WITH SECURITY INVOKER
-- ============================================================================

-- Drop the existing view
drop view if exists public.workflows;

-- Recreate the view with security invoker to enforce RLS
-- This makes the view execute with the privileges of the user calling it,
-- not the user who created it, which allows RLS policies to be enforced
create or replace view public.workflows
with (security_invoker = true)
as
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

comment on view public.workflows is 'View mapping workflow_definitions to workflows with RLS enforcement via security_invoker';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
grant select on public.workflows to authenticated;
grant insert on public.workflows to authenticated;
grant update on public.workflows to authenticated;
grant delete on public.workflows to authenticated;