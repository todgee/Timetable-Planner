-- =============================================================
-- Fix: RLS infinite recursion on timetables / timetable_members
-- Paste and run this in Supabase → Database → SQL Editor.
-- =============================================================

-- 1. SECURITY DEFINER helper — reads timetable_members without
--    triggering its RLS policy, breaking the circular dependency.
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

-- 2. timetables SELECT — use the helper instead of a direct subquery.
DROP POLICY IF EXISTS "timetables: select own"          ON timetables;
DROP POLICY IF EXISTS "timetables: select own or member" ON timetables;
CREATE POLICY "timetables: select own or member"
  ON timetables FOR SELECT
  USING (
    auth.uid() = owner_id
    OR public.is_timetable_member(id)
  );

-- 3. timetable_members SELECT — use invited_by (owner's uid) instead of
--    joining timetables, which would loop back to step 2.
DROP POLICY IF EXISTS "members: select owner or self" ON timetable_members;
CREATE POLICY "members: select owner or self"
  ON timetable_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
  );

-- 4. timetable_data SELECT — delegate to timetables RLS (no direct member check needed).
DROP POLICY IF EXISTS "timetable_data: select own"          ON timetable_data;
DROP POLICY IF EXISTS "timetable_data: select own or member" ON timetable_data;
CREATE POLICY "timetable_data: select own or member"
  ON timetable_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_data.timetable_id
    )
  );

-- 5. timetable_config SELECT — same pattern as timetable_data.
DROP POLICY IF EXISTS "timetable_config: select own"          ON timetable_config;
DROP POLICY IF EXISTS "timetable_config: select own or member" ON timetable_config;
CREATE POLICY "timetable_config: select own or member"
  ON timetable_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_config.timetable_id
    )
  );
