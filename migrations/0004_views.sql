-- Compatibility views.
--
-- `workflows` presents workflow_definitions under the name the application
-- layer uses. Under Postgres this view was declared `with (security_invoker =
-- true)` so RLS applied to the caller (…0009_fix_workflows_view_rls.sql).
-- SQLite has neither RLS nor security_invoker, so the view is a plain
-- projection and the ownership check moved into the query helpers in
-- packages/shared/lib/authz.js.
--
-- Note this view is read-only. Postgres granted insert/update/delete on it via
-- rules; SQLite would need INSTEAD OF triggers, and no call site writes through
-- the view, so writes go directly to workflow_definitions.

drop view if exists workflows;

create view workflows as
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
from workflow_definitions;
