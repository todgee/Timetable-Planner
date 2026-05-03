-- =============================================================
-- RLS Policies — Timetable Planner
-- Run this in the Supabase SQL editor (Database → SQL Editor).
-- Safe to re-run: uses DROP IF EXISTS before CREATE.
-- =============================================================


-- ── 0. Helper function ───────────────────────────────────────
--   SECURITY DEFINER bypasses RLS on timetable_members, which
--   prevents the circular dependency:
--     timetables policy → timetable_members → timetables policy → …

CREATE OR REPLACE FUNCTION public.is_timetable_member(tt_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM timetable_members
    WHERE timetable_id = tt_id
      AND user_id = auth.uid()
  );
$$;


-- ── 1. timetables ────────────────────────────────────────────
--   owner_id is set by the app to auth.uid() on insert.
--   All operations are restricted to the owning user.

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetables: select own"           ON timetables;
DROP POLICY IF EXISTS "timetables: select own or member"  ON timetables;
DROP POLICY IF EXISTS "timetables: insert own"            ON timetables;
DROP POLICY IF EXISTS "timetables: update own"            ON timetables;
DROP POLICY IF EXISTS "timetables: delete own"            ON timetables;

-- Owners see all their timetables; accepted members see timetables they joined.
-- Uses is_timetable_member() (SECURITY DEFINER) to avoid RLS recursion.
CREATE POLICY "timetables: select own or member"
  ON timetables FOR SELECT
  USING (
    auth.uid() = owner_id
    OR public.is_timetable_member(id)
  );

-- Enforce that new rows can only be created for the signed-in user.
CREATE POLICY "timetables: insert own"
  ON timetables FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "timetables: update own"
  ON timetables FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "timetables: delete own"
  ON timetables FOR DELETE
  USING (auth.uid() = owner_id);


-- ── 2. timetable_data ────────────────────────────────────────
--   No owner_id column here — access is derived from the parent
--   timetables row, so we sub-select to check ownership.

ALTER TABLE timetable_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_data: select own"           ON timetable_data;
DROP POLICY IF EXISTS "timetable_data: select own or member"  ON timetable_data;
DROP POLICY IF EXISTS "timetable_data: insert own"            ON timetable_data;
DROP POLICY IF EXISTS "timetable_data: update own"            ON timetable_data;
DROP POLICY IF EXISTS "timetable_data: delete own"            ON timetable_data;

-- Delegate access check to the timetables RLS (which handles owner + member via the helper fn)
CREATE POLICY "timetable_data: select own or member"
  ON timetable_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_data.timetable_id
    )
  );

CREATE POLICY "timetable_data: insert own"
  ON timetable_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_data.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );

CREATE POLICY "timetable_data: update own"
  ON timetable_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_data.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );

CREATE POLICY "timetable_data: delete own"
  ON timetable_data FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_data.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );


-- ── 3. timetable_config ──────────────────────────────────────
--   Same pattern as timetable_data.

ALTER TABLE timetable_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_config: select own"           ON timetable_config;
DROP POLICY IF EXISTS "timetable_config: select own or member"  ON timetable_config;
DROP POLICY IF EXISTS "timetable_config: insert own"            ON timetable_config;
DROP POLICY IF EXISTS "timetable_config: update own"            ON timetable_config;
DROP POLICY IF EXISTS "timetable_config: delete own"            ON timetable_config;

CREATE POLICY "timetable_config: select own or member"
  ON timetable_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_config.timetable_id
    )
  );

CREATE POLICY "timetable_config: insert own"
  ON timetable_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_config.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );

CREATE POLICY "timetable_config: update own"
  ON timetable_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_config.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );

CREATE POLICY "timetable_config: delete own"
  ON timetable_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_config.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );


-- =============================================================
-- Verification queries — run these after applying the policies
-- to confirm they're active on each table.
-- =============================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('timetables', 'timetable_data', 'timetable_config')
-- ORDER BY tablename, cmd;
