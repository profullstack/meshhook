-- Force PostgREST schema cache reload
-- This ensures the new columns in the workflows view are recognized

-- Send NOTIFY signal to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Add a comment to track this reload
COMMENT ON VIEW public.workflows IS 'View mapping workflow_definitions to workflows - schema reloaded 2025-01-10';