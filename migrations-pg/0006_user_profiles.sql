-- Signup profile fields (@profullstack/profile): email, first_name, last_name,
-- company_domain, job_title, linkedin_url, keyed by users.id. Output of
-- `profile schema --key user_id --key-type text`. Read and written server-side only.

create table if not exists "user_profiles" (
  "user_id" text primary key,
  "email" text,
  "first_name" text,
  "last_name" text,
  "company_domain" text,
  "job_title" text,
  "linkedin_url" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);
create index if not exists "user_profiles_email" on "user_profiles" (lower("email"));
create index if not exists "user_profiles_company_domain" on "user_profiles" ("company_domain");

-- One-time backfill: existing users get a row carrying their account email.
-- users has no name column, so nothing else to copy. Never overwrites a value.
insert into user_profiles (user_id, email)
select id, lower(email) from users
on conflict (user_id) do update
   set email = coalesce(user_profiles.email, excluded.email);
