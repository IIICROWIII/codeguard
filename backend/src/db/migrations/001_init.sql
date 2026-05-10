-- CodeGuard initial schema
-- Phase 2: users, challenges, submissions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'security');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  difficulty      difficulty_level NOT NULL,
  starter_code    TEXT NOT NULL,
  expected_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  feedback     JSONB NOT NULL DEFAULT '{}'::jsonb,
  score        INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id      ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
