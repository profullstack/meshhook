-- Step queue configuration. See migrations/0005_step_queue.sql: steps are
-- durable queue rows with a longer lease than runs, because a step performs an
-- outbound HTTP call with its own retries.

insert into queue_config (
  queue_name, visibility_timeout_seconds, max_retry_attempts,
  retry_backoff_base_ms, retry_backoff_max_ms, dlq_enabled
) values ('workflow_steps', 120, 5, 1000, 300000, 1)
on conflict (queue_name) do nothing;
