-- Compatibility view: `workflows` presents workflow_definitions under the name
-- the application layer uses. Read-only; ownership checks live in
-- packages/shared/lib/authz.js. See migrations/0004_views.sql.

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
