-- MeshHook Event Partitioning Migration
-- Issue #88: Set up event partitioning
-- This migration converts workflow_events to a partitioned table for better performance and maintenance

-- ============================================================================
-- STEP 1: Create new partitioned table
-- ============================================================================

-- Create the new partitioned table structure
-- Note: We cannot convert an existing table to partitioned, so we create a new one
create table if not exists workflow_events_partitioned (
  id bigserial,
  run_id uuid not null,
  ts timestamptz not null default now(),
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (id, ts)
) partition by range (ts);

-- Add foreign key constraint (will be inherited by partitions)
alter table workflow_events_partitioned 
  add constraint fk_workflow_events_run_id 
  foreign key (run_id) references workflow_runs(id) on delete cascade;

-- Add comment
comment on table workflow_events_partitioned is 'Event sourcing log for deterministic replay - partitioned by timestamp for performance';

-- ============================================================================
-- STEP 2: Create initial partitions
-- ============================================================================

-- Function to create a partition for a given month
create or replace function create_workflow_events_partition(
  partition_date date
) returns text as $$
declare
  partition_name text;
  start_date date;
  end_date date;
begin
  -- Calculate partition boundaries (first day of month to first day of next month)
  start_date := date_trunc('month', partition_date)::date;
  end_date := (date_trunc('month', partition_date) + interval '1 month')::date;
  
  -- Generate partition name (e.g., workflow_events_y2025m01)
  partition_name := 'workflow_events_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');
  
  -- Create partition if it doesn't exist
  execute format(
    'create table if not exists %I partition of workflow_events_partitioned
     for values from (%L) to (%L)',
    partition_name,
    start_date,
    end_date
  );
  
  -- Create indices on the partition
  execute format('create index if not exists %I on %I(run_id)', 
    partition_name || '_run_id_idx', partition_name);
  execute format('create index if not exists %I on %I(run_id, ts)', 
    partition_name || '_run_ts_idx', partition_name);
  execute format('create index if not exists %I on %I(type)', 
    partition_name || '_type_idx', partition_name);
  
  return partition_name;
end;
$$ language plpgsql;

-- Create partitions for past 2 months, current month, and next 3 months
do $$
declare
  month_offset int;
  partition_name text;
begin
  -- Create partitions from 2 months ago to 3 months in the future
  for month_offset in -2..3 loop
    partition_name := create_workflow_events_partition(
      (current_date + (month_offset || ' months')::interval)::date
    );
    raise notice 'Created partition: %', partition_name;
  end loop;
end $$;

-- ============================================================================
-- STEP 3: Migrate existing data (if any)
-- ============================================================================

-- Copy data from old table to new partitioned table
-- This will only run if the old table exists and has data
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_name = 'workflow_events' 
    and table_schema = current_schema()
  ) then
    -- Check if old table has data
    if exists (select 1 from workflow_events limit 1) then
      raise notice 'Migrating data from workflow_events to workflow_events_partitioned...';
      
      insert into workflow_events_partitioned (id, run_id, ts, type, payload, created_at)
      select id, run_id, ts, type, payload, created_at
      from workflow_events
      on conflict do nothing;
      
      raise notice 'Data migration completed';
    else
      raise notice 'No data to migrate from workflow_events';
    end if;
  else
    raise notice 'Original workflow_events table does not exist, skipping migration';
  end if;
end $$;

-- ============================================================================
-- STEP 4: Replace old table with partitioned table
-- ============================================================================

-- Drop old table and rename new one
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_name = 'workflow_events' 
    and table_schema = current_schema()
  ) then
    drop table workflow_events cascade;
    raise notice 'Dropped old workflow_events table';
  end if;
end $$;

-- Rename partitioned table to workflow_events
alter table workflow_events_partitioned rename to workflow_events;

-- Rename the foreign key constraint to match original naming
alter table workflow_events 
  rename constraint fk_workflow_events_run_id 
  to workflow_events_run_id_fkey;

-- ============================================================================
-- STEP 5: Create automatic partition management function
-- ============================================================================

-- Function to ensure future partitions exist
create or replace function maintain_workflow_events_partitions()
returns void as $$
declare
  month_offset int;
  partition_name text;
  partition_count int;
begin
  -- Count existing future partitions
  select count(*) into partition_count
  from pg_tables
  where schemaname = current_schema()
    and tablename like 'workflow_events_y%'
    and tablename >= 'workflow_events_y' || to_char(current_date, 'YYYY') || 'm' || to_char(current_date, 'MM');
  
  -- Ensure we have at least 3 months of future partitions
  if partition_count < 3 then
    raise notice 'Creating future partitions for workflow_events...';
    
    -- Create partitions for next 3 months if they don't exist
    for month_offset in 0..3 loop
      partition_name := create_workflow_events_partition(
        (current_date + (month_offset || ' months')::interval)::date
      );
      raise notice 'Ensured partition exists: %', partition_name;
    end loop;
  end if;
end;
$$ language plpgsql;

-- ============================================================================
-- STEP 6: Create partition cleanup function (optional)
-- ============================================================================

-- Function to drop old partitions (for data retention policies)
create or replace function drop_old_workflow_events_partitions(
  retention_months int default 12
)
returns void as $$
declare
  partition_record record;
  cutoff_date date;
begin
  cutoff_date := (current_date - (retention_months || ' months')::interval)::date;
  
  raise notice 'Dropping partitions older than %', cutoff_date;
  
  for partition_record in
    select tablename
    from pg_tables
    where schemaname = current_schema()
      and tablename like 'workflow_events_y%'
      and tablename < 'workflow_events_y' || to_char(cutoff_date, 'YYYY') || 'm' || to_char(cutoff_date, 'MM')
  loop
    execute format('drop table if exists %I', partition_record.tablename);
    raise notice 'Dropped old partition: %', partition_record.tablename;
  end loop;
end;
$$ language plpgsql;

-- ============================================================================
-- STEP 7: Create helper views and functions
-- ============================================================================

-- View to show partition information
create or replace view workflow_events_partition_info as
select
  schemaname,
  tablename as partition_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  (select count(*) from pg_class c 
   where c.relname = tablename and c.relkind = 'r') as row_count_estimate
from pg_tables
where schemaname = current_schema()
  and tablename like 'workflow_events_y%'
order by tablename;

comment on view workflow_events_partition_info is 'Shows information about workflow_events partitions';

-- Function to get partition statistics
create or replace function get_workflow_events_partition_stats()
returns table (
  partition_name text,
  start_date date,
  end_date date,
  row_count bigint,
  size_bytes bigint,
  size_pretty text
) as $$
begin
  return query
  select
    c.relname::text as partition_name,
    pg_get_expr(c.relpartbound, c.oid)::text as bounds,
    null::date as start_date,
    null::date as end_date,
    c.reltuples::bigint as row_count,
    pg_total_relation_size(c.oid) as size_bytes,
    pg_size_pretty(pg_total_relation_size(c.oid)) as size_pretty
  from pg_class c
  join pg_inherits i on i.inhrelid = c.oid
  join pg_class p on p.oid = i.inhparent
  where p.relname = 'workflow_events'
    and c.relkind = 'r'
  order by c.relname;
end;
$$ language plpgsql;

-- ============================================================================
-- STEP 8: Set up automatic partition maintenance (using pg_cron if available)
-- ============================================================================

-- Note: This requires pg_cron extension. If not available, run maintain_workflow_events_partitions() manually
-- or set up an external cron job

-- Check if pg_cron is available and create scheduled job
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Schedule partition maintenance to run daily at 2 AM
    perform cron.schedule(
      'maintain-workflow-events-partitions',
      '0 2 * * *',
      'select maintain_workflow_events_partitions()'
    );
    raise notice 'Scheduled automatic partition maintenance with pg_cron';
  else
    raise notice 'pg_cron extension not available. Please run maintain_workflow_events_partitions() manually or via external cron';
  end if;
exception
  when others then
    raise notice 'Could not schedule automatic partition maintenance: %', sqlerrm;
end $$;

-- ============================================================================
-- STEP 9: Create convenience functions for common queries
-- ============================================================================

-- Function to get events for a run (optimized for partitioned table)
create or replace function get_workflow_run_events(
  p_run_id uuid,
  p_start_ts timestamptz default null,
  p_end_ts timestamptz default null
)
returns table (
  id bigint,
  run_id uuid,
  ts timestamptz,
  type text,
  payload jsonb,
  created_at timestamptz
) as $$
begin
  return query
  select e.id, e.run_id, e.ts, e.type, e.payload, e.created_at
  from workflow_events e
  where e.run_id = p_run_id
    and (p_start_ts is null or e.ts >= p_start_ts)
    and (p_end_ts is null or e.ts <= p_end_ts)
  order by e.ts, e.id;
end;
$$ language plpgsql stable;

comment on function get_workflow_run_events is 'Efficiently retrieves events for a workflow run with optional time range filtering';

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

comment on function create_workflow_events_partition is 'Creates a monthly partition for workflow_events table';
comment on function maintain_workflow_events_partitions is 'Ensures at least 3 months of future partitions exist';
comment on function drop_old_workflow_events_partitions is 'Drops partitions older than specified retention period (default 12 months)';
comment on function get_workflow_events_partition_stats is 'Returns statistics about all workflow_events partitions';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify partitioning is set up correctly
do $$
declare
  partition_count int;
  parent_table_name text;
begin
  -- Check if table is partitioned
  select relname into parent_table_name
  from pg_class
  where relname = 'workflow_events'
    and relkind = 'p'; -- 'p' means partitioned table
  
  if parent_table_name is null then
    raise exception 'workflow_events is not a partitioned table!';
  end if;
  
  -- Count partitions
  select count(*) into partition_count
  from pg_inherits i
  join pg_class c on c.oid = i.inhrelid
  join pg_class p on p.oid = i.inhparent
  where p.relname = 'workflow_events';
  
  raise notice 'Partitioning setup complete!';
  raise notice 'Parent table: %', parent_table_name;
  raise notice 'Number of partitions: %', partition_count;
  raise notice 'Run "select * from workflow_events_partition_info;" to see partition details';
end $$;