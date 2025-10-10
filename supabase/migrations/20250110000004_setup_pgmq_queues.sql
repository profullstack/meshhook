-- MeshHook PGMQ Queue Setup Migration
-- Issue #90: Create queue tables/setup
-- This migration installs PGMQ extension and creates queues for workflow job processing

-- ============================================================================
-- INSTALL PGMQ EXTENSION
-- ============================================================================

-- Install PGMQ extension (requires superuser or appropriate permissions)
-- Note: On Supabase, this may need to be enabled via the dashboard
create extension if not exists pgmq cascade;

-- ============================================================================
-- ENSURE HELPER FUNCTION EXISTS
-- ============================================================================

-- Ensure the update_updated_at_column function exists in public schema
-- (should be created in migration 1, but we ensure it here for safety)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- CREATE MAIN WORKFLOW JOBS QUEUE
-- ============================================================================

-- Create the main queue for workflow job processing
-- Queue name: workflow_jobs
-- VT (visibility timeout): 30 seconds (default)
select pgmq.create('workflow_jobs');

-- ============================================================================
-- CREATE DEAD LETTER QUEUE (DLQ)
-- ============================================================================

-- Create dead letter queue for failed jobs that exceed max retry attempts
-- Queue name: workflow_jobs_dlq
select pgmq.create('workflow_jobs_dlq');

-- ============================================================================
-- QUEUE CONFIGURATION TABLE
-- ============================================================================

-- Store queue configuration and metadata
create table if not exists public.queue_config (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null unique,
  visibility_timeout_seconds int not null default 30,
  max_retry_attempts int not null default 5,
  retry_backoff_base_ms int not null default 1000,
  retry_backoff_max_ms int not null default 300000,
  dlq_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add trigger to update updated_at timestamp
create trigger update_queue_config_updated_at
  before update on public.queue_config
  for each row
  execute function public.update_updated_at_column();

-- Insert default configuration for workflow_jobs queue
insert into public.queue_config (
  queue_name,
  visibility_timeout_seconds,
  max_retry_attempts,
  retry_backoff_base_ms,
  retry_backoff_max_ms,
  dlq_enabled
) values (
  'workflow_jobs',
  30,
  5,
  1000,
  300000,
  true
) on conflict (queue_name) do nothing;

-- Insert configuration for DLQ
insert into public.queue_config (
  queue_name,
  visibility_timeout_seconds,
  max_retry_attempts,
  retry_backoff_base_ms,
  retry_backoff_max_ms,
  dlq_enabled
) values (
  'workflow_jobs_dlq',
  300,
  0,
  0,
  0,
  false
) on conflict (queue_name) do nothing;

-- ============================================================================
-- JOB TRACKING TABLE
-- ============================================================================

-- Track job processing history and retry attempts
create table if not exists public.job_tracking (
  id uuid primary key default gen_random_uuid(),
  msg_id bigint not null,
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  queue_name text not null,
  attempt int not null default 1,
  max_attempts int not null default 5,
  enqueued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  moved_to_dlq_at timestamptz,
  error_message text,
  error_stack text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add indices for job tracking queries
create index if not exists idx_job_tracking_msg_id on public.job_tracking(msg_id);
create index if not exists idx_job_tracking_run_id on public.job_tracking(run_id);
create index if not exists idx_job_tracking_queue_name on public.job_tracking(queue_name);
create index if not exists idx_job_tracking_enqueued_at on public.job_tracking(enqueued_at desc);
create index if not exists idx_job_tracking_status on public.job_tracking(completed_at, failed_at, moved_to_dlq_at);

-- Add trigger to update updated_at timestamp
create trigger update_job_tracking_updated_at
  before update on public.job_tracking
  for each row
  execute function public.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get queue metrics
create or replace function public.get_queue_metrics(p_queue_name text)
returns table (
  queue_name text,
  queue_length bigint,
  oldest_msg_age_seconds numeric,
  newest_msg_age_seconds numeric
) as $$
begin
  return query
  select
    p_queue_name::text,
    pgmq.queue_length(p_queue_name),
    extract(epoch from (now() - min(enqueued_at)))::numeric as oldest_msg_age_seconds,
    extract(epoch from (now() - max(enqueued_at)))::numeric as newest_msg_age_seconds
  from pgmq.q_workflow_jobs;
end;
$$ language plpgsql;

-- Function to purge old archived messages
create or replace function public.purge_old_queue_archives(p_days int default 30)
returns bigint as $$
declare
  v_deleted bigint;
begin
  -- Delete archived messages older than specified days
  delete from pgmq.a_workflow_jobs
  where archived_at < now() - (p_days || ' days')::interval;
  
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$ language plpgsql;

-- Function to move job to DLQ
create or replace function public.move_job_to_dlq(
  p_msg_id bigint,
  p_message jsonb,
  p_error_message text default null
)
returns bigint as $$
declare
  v_dlq_msg_id bigint;
  v_enhanced_message jsonb;
begin
  -- Enhance message with DLQ metadata
  v_enhanced_message := p_message || jsonb_build_object(
    'moved_to_dlq_at', now(),
    'original_msg_id', p_msg_id,
    'error_message', p_error_message
  );
  
  -- Send to DLQ
  select msg_id into v_dlq_msg_id
  from pgmq.send('workflow_jobs_dlq', v_enhanced_message);
  
  -- Archive original message
  perform pgmq.archive('workflow_jobs', p_msg_id);
  
  return v_dlq_msg_id;
end;
$$ language plpgsql;

-- ============================================================================
-- QUEUE MONITORING VIEW
-- ============================================================================

-- Create view for queue monitoring
create or replace view public.queue_monitoring as
select
  'workflow_jobs' as queue_name,
  count(*) as pending_jobs,
  count(*) filter (where vt > now()) as invisible_jobs,
  count(*) filter (where vt <= now()) as visible_jobs,
  min(enqueued_at) as oldest_job_time,
  max(enqueued_at) as newest_job_time,
  extract(epoch from (now() - min(enqueued_at)))::int as oldest_job_age_seconds
from pgmq.q_workflow_jobs
union all
select
  'workflow_jobs_dlq' as queue_name,
  count(*) as pending_jobs,
  count(*) filter (where vt > now()) as invisible_jobs,
  count(*) filter (where vt <= now()) as visible_jobs,
  min(enqueued_at) as oldest_job_time,
  max(enqueued_at) as newest_job_time,
  extract(epoch from (now() - min(enqueued_at)))::int as oldest_job_age_seconds
from pgmq.q_workflow_jobs_dlq;

-- ============================================================================
-- JOB STATISTICS VIEW
-- ============================================================================

-- Create view for job statistics
create or replace view public.job_statistics as
select
  queue_name,
  count(*) as total_jobs,
  count(*) filter (where completed_at is not null) as completed_jobs,
  count(*) filter (where failed_at is not null) as failed_jobs,
  count(*) filter (where moved_to_dlq_at is not null) as dlq_jobs,
  count(*) filter (where completed_at is null and failed_at is null and moved_to_dlq_at is null) as pending_jobs,
  avg(extract(epoch from (completed_at - started_at))) filter (where completed_at is not null) as avg_processing_time_seconds,
  avg(attempt) as avg_attempts,
  max(attempt) as max_attempts_seen
from public.job_tracking
group by queue_name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.queue_config is 'Configuration for PGMQ queues including retry and DLQ settings';
comment on table public.job_tracking is 'Tracks job processing history, retry attempts, and failures';
comment on function public.get_queue_metrics(text) is 'Returns current metrics for a specified queue';
comment on function public.purge_old_queue_archives(int) is 'Purges archived queue messages older than specified days';
comment on function public.move_job_to_dlq(bigint, jsonb, text) is 'Moves a failed job to the dead letter queue';
comment on view public.queue_monitoring is 'Real-time monitoring view for queue status';
comment on view public.job_statistics is 'Aggregated statistics for job processing';

-- ============================================================================
-- GRANTS (if needed for specific roles)
-- ============================================================================

-- Grant access to authenticated users (adjust as needed for your security model)
-- grant select on queue_monitoring to authenticated;
-- grant select on job_statistics to authenticated;