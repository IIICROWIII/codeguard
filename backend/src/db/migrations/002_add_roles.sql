-- Phase 3: add role + 2FA to users, add refresh_tokens table

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role        user_role    NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255),
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN     NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(user_id);