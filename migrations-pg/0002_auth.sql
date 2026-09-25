-- Authentication tables, Postgres. See migrations/0002_auth.sql for the
-- reasoning; the shape is the same, with the conventions of 0001 (text ISO
-- timestamps, gen_random_uuid() ids, a BEFORE UPDATE trigger for updated_at).

create table if not exists users (
  id text primary key default (gen_random_uuid()::text),
  -- Stored lower-cased; the unique index is therefore already case-insensitive.
  email text not null unique,
  -- scrypt output, "scrypt$N$r$p$salt$hash". Null for external identities.
  password_hash text,
  email_verified bigint not null default 0 check (email_verified in (0, 1)),
  created_at text not null default (meshhook_now_iso()),
  updated_at text not null default (meshhook_now_iso())
);

create index if not exists idx_users_email on users(email);

drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at
before update on users for each row
execute function meshhook_set_updated_at();

-- Opaque session tokens; only the SHA-256 of the token is stored.
create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default (meshhook_now_iso()),
  last_seen_at text not null default (meshhook_now_iso()),
  user_agent text,
  ip_address text
);

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_expires_at on sessions(expires_at);

create table if not exists user_settings (
  id text primary key default (gen_random_uuid()::text),
  user_id text not null unique references users(id) on delete cascade,
  theme_preference text default 'light' check (theme_preference in ('light', 'dark')),
  created_at text not null default (meshhook_now_iso()),
  updated_at text not null default (meshhook_now_iso())
);

create index if not exists idx_user_settings_user_id on user_settings(user_id);
create index if not exists idx_user_settings_theme on user_settings(theme_preference);

drop trigger if exists update_user_settings_updated_at on user_settings;
create trigger update_user_settings_updated_at
before update on user_settings for each row
execute function meshhook_set_updated_at();
