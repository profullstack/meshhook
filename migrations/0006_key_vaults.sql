-- Key vaults (unlock-on-use, 2026-10-28). The app also creates this table on
-- first use (packages/shared/lib/vault.js), so applying by hand is optional.
-- owner = a user id (workflow secrets sealed to that user's inbox) or
-- 'operator' (operator_secrets: the x402 payer key sealed under the operator
-- vault's data key). Nothing here opens without a passphrase or recovery key.
create table if not exists key_vaults (
  owner text primary key,
  seal text not null,
  operator_secrets text,
  created_at text not null default (CURRENT_TIMESTAMP),
  updated_at text not null default (CURRENT_TIMESTAMP)
);
