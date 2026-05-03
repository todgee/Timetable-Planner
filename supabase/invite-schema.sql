-- =============================================================
-- Invite Schema — Timetable Planner
-- Run in Supabase SQL Editor (Database → SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS.
-- =============================================================


-- ── 1. timetable_invites ─────────────────────────────────────
--   Tracks pending, accepted, and revoked invites.
--   token is the unique secret embedded in the invite link.

CREATE TABLE IF NOT EXISTS timetable_invites (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id   UUID        NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  timetable_name TEXT        NOT NULL,
  invited_by     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email  TEXT        NOT NULL,
  token          UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE timetable_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites: select owner or invitee"  ON timetable_invites;
DROP POLICY IF EXISTS "invites: insert owner"             ON timetable_invites;
DROP POLICY IF EXISTS "invites: update owner or invitee"  ON timetable_invites;

-- Owner sees all invites for their timetable; invitee sees their own
CREATE POLICY "invites: select owner or invitee"
  ON timetable_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_invites.timetable_id
        AND timetables.owner_id = auth.uid()
    )
    OR invited_email = (auth.jwt()->>'email')
  );

-- Only the timetable owner can send invites
CREATE POLICY "invites: insert owner"
  ON timetable_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_invites.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );

-- Owner can revoke; invitee can mark as accepted
CREATE POLICY "invites: update owner or invitee"
  ON timetable_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_invites.timetable_id
        AND timetables.owner_id = auth.uid()
    )
    OR invited_email = (auth.jwt()->>'email')
  );


-- ── 2. timetable_members ─────────────────────────────────────
--   Accepted members who can view a timetable.

CREATE TABLE IF NOT EXISTS timetable_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id  UUID        NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (timetable_id, user_id)
);

ALTER TABLE timetable_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members: select owner or self"          ON timetable_members;
DROP POLICY IF EXISTS "members: insert self with valid invite" ON timetable_members;
DROP POLICY IF EXISTS "members: delete owner or self"         ON timetable_members;

-- Owner and the member themselves can view the membership row
CREATE POLICY "members: select owner or self"
  ON timetable_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_members.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );

-- A user can join only when a valid pending invite exists for their email
CREATE POLICY "members: insert self with valid invite"
  ON timetable_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM timetable_invites
      WHERE timetable_invites.timetable_id = timetable_members.timetable_id
        AND timetable_invites.invited_email = (auth.jwt()->>'email')
        AND timetable_invites.status = 'pending'
        AND timetable_invites.expires_at > now()
    )
  );

-- Owner can remove any member; members can remove themselves
CREATE POLICY "members: delete owner or self"
  ON timetable_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM timetables
      WHERE timetables.id = timetable_members.timetable_id
        AND timetables.owner_id = auth.uid()
    )
  );


-- =============================================================
-- Verification
-- =============================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('timetable_invites', 'timetable_members')
-- ORDER BY tablename, cmd;
