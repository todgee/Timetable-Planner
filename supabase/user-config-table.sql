-- =============================================================
-- user_config table — global per-user appearance preferences
-- Run in Supabase SQL Editor (Database → SQL Editor).
-- =============================================================

CREATE TABLE IF NOT EXISTS user_config (
  user_id        UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_primary  TEXT    NOT NULL DEFAULT '#2c5f4f',
  theme_accent   TEXT,               -- NULL = auto-computed by ThemeEngine
  theme_mode     TEXT    NOT NULL DEFAULT 'dark',
  bg_start       TEXT,
  bg_end         TEXT,
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_config: select own" ON user_config;
DROP POLICY IF EXISTS "user_config: insert own" ON user_config;
DROP POLICY IF EXISTS "user_config: update own" ON user_config;

CREATE POLICY "user_config: select own"
  ON user_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_config: insert own"
  ON user_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_config: update own"
  ON user_config FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- Verification
-- =============================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'user_config'
-- ORDER BY cmd;
