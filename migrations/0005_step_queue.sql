-- Step queue configuration.
--
-- Node execution used to be dispatched over an in-process EventEmitter, which
-- neither crossed a process boundary nor survived a restart. Steps are now
-- durable queue rows like runs, so they need their own config entry.
--
-- The visibility timeout is longer than the run queue's: a step performs an
-- outbound HTTP call with its own retries, so a 30s lease could lapse while the
-- work is legitimately still in flight and cause a duplicate execution.

insert into queue_config (
  queue_name, visibility_timeout_seconds, max_retry_attempts,
  retry_backoff_base_ms, retry_backoff_max_ms, dlq_enabled
) values ('workflow_steps', 120, 5, 1000, 300000, 1)
on conflict (queue_name) do nothing;
