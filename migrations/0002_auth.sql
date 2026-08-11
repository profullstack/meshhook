-- Authentication tables.
--
-- Supabase provided auth.users, the session/JWT machinery and the auth.uid()
-- function used throughout the old RLS policies. None of that exists on Turso,
-- so MeshHook now owns its user and session storage. Password hashing and
-- session issuance live in packages/shared/lib/auth.js.
--
-- Columns that Supabase's auth.users exposed and application code read
-- (id, email, created_at) keep their names so call sites read the same.

create table if not exists users (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  -- Stored lower-cased; the unique index is therefore already case-insensitive
  -- without needing a collation.
  email text not null unique,
  -- scrypt output, encoded as "scrypt$N$r$p$salt$hash". Null only for accounts
  -- created by an external identity provider.
  password_hash text,
  email_verified integer not null default 0 check (email_verified in (0, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_users_email on users(email);

create trigger if not exists update_users_updated_at
after update on users for each row
begin
  update users set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- Opaque session tokens. Only the SHA-256 of the token is stored, so a database
-- leak does not hand out live sessions; the plaintext exists solely in the
-- user's cookie.
create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  user_agent text,
  ip_address text
);

create index if not exists idx_sessions_user_id on sessions(user_id);
-- Drives the expired-session sweep.
create index if not exists idx_sessions_expires_at on sessions(expires_at);

-- Per-user UI preferences. Previously referenced auth.users(id); now points at
-- the local users table.
create table if not exists user_settings (
  id text primary key default (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', abs(random()) % 4 + 1, 1) ||
          substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
  ),
  user_id text not null unique references users(id) on delete cascade,
  theme_preference text default 'light' check (theme_preference in ('light', 'dark')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_user_settings_user_id on user_settings(user_id);
create index if not exists idx_user_settings_theme on user_settings(theme_preference);

create trigger if not exists update_user_settings_updated_at
after update on user_settings for each row
begin
  update user_settings set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;
