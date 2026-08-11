-- Job queue.
--
-- Replaces the pgmq extension (supabase/migrations/…0004_setup_pgmq_queues.sql),
-- which does not exist for SQLite. pgmq created a table pair per queue
-- (pgmq.q_<name> / pgmq.a_<name>); here a single table carries a queue_name
-- column, because SQLite has no schemas and creating tables at runtime would
-- fight the migration runner.
--
-- The visibility-timeout model is preserved exactly: a message is available
-- when vt <= now, a read pushes vt into the future and bumps read_ct, and an
-- unacknowledged message becomes visible again when its lease lapses. The
-- claim itself is done in a transaction in packages/shared/lib/queue.js, since
-- the plpgsql that used to guarantee atomicity is gone.

create table if not exists queue_messages (
  -- integer primary key => rowid alias, so msg_id autoincrements like pgmq's
  -- bigserial and stays comparable for FIFO ordering.
  msg_id integer primary key,
  queue_name text not null,
  message text not null,
  read_ct integer not null default 0,
  enqueued_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- Visibility time: the message is invisible to readers until this instant.
  -- A delayed send sets it forward; an immediate send sets it to now.
  vt text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The dequeue hot path: find the oldest visible message on one queue.
create index if not exists idx_queue_messages_claim on queue_messages(queue_name, vt, msg_id);

-- Archived messages. pgmq.archive() moved rows to a_<queue>; this keeps the
-- original msg_id so job_tracking rows still join.
create table if not exists queue_archive (
  msg_id integer primary key,
  queue_name text not null,
  message text not null,
  read_ct integer not null default 0,
  enqueued_at text not null,
  archived_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_queue_archive_queue_name on queue_archive(queue_name);
create index if not exists idx_queue_archive_archived_at on queue_archive(archived_at desc);

create table if not exists queue_config (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  queue_name text not null unique,
  visibility_timeout_seconds integer not null default 30,
  max_retry_attempts integer not null default 5,
  retry_backoff_base_ms integer not null default 1000,
  retry_backoff_max_ms integer not null default 300000,
  dlq_enabled integer not null default 1 check (dlq_enabled in (0, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create trigger if not exists update_queue_config_updated_at
after update on queue_config for each row
begin
  update queue_config set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

insert into queue_config (
  queue_name, visibility_timeout_seconds, max_retry_attempts,
  retry_backoff_base_ms, retry_backoff_max_ms, dlq_enabled
) values ('workflow_jobs', 30, 5, 1000, 300000, 1)
on conflict (queue_name) do nothing;

-- The DLQ is a terminal destination: nothing retries out of it automatically,
-- hence zero attempts and no onward DLQ.
insert into queue_config (
  queue_name, visibility_timeout_seconds, max_retry_attempts,
  retry_backoff_base_ms, retry_backoff_max_ms, dlq_enabled
) values ('workflow_jobs_dlq', 300, 0, 0, 0, 0)
on conflict (queue_name) do nothing;

create table if not exists job_tracking (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  msg_id integer not null,
  run_id text not null references workflow_runs(id) on delete cascade,
  queue_name text not null,
  attempt integer not null default 1,
  max_attempts integer not null default 5,
  enqueued_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at text,
  completed_at text,
  failed_at text,
  moved_to_dlq_at text,
  error_message text,
  error_stack text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_job_tracking_msg_id on job_tracking(msg_id);
create index if not exists idx_job_tracking_run_id on job_tracking(run_id);
create index if not exists idx_job_tracking_queue_name on job_tracking(queue_name);
create index if not exists idx_job_tracking_enqueued_at on job_tracking(enqueued_at desc);
create index if not exists idx_job_tracking_status on job_tracking(completed_at, failed_at, moved_to_dlq_at);

create trigger if not exists update_job_tracking_updated_at
after update on job_tracking for each row
begin
  update job_tracking set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;
