-- =============================================================
-- TIMETABLE PLANNER — DATABASE SCHEMA
-- Run this in Supabase → SQL Editor
-- =============================================================


-- =============================================================
-- EXTENSIONS
-- =============================================================

create extension if not exists "uuid-ossp";


-- =============================================================
-- ENUMS
-- =============================================================

create type member_role as enum ('admin', 'viewer');
create type slot_type   as enum ('class', 'recess', 'lunch', 'break');
create type day_of_week as enum ('monday', 'tuesday', 'wednesday', 'thursday', 'friday');


-- =============================================================
-- PROFILES
-- Mirrors auth.users — stores app-level user data.
-- Auto-populated via a trigger when a user signs up.
-- =============================================================

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  first_name    text,
  last_name     text,
  full_name     text,
  organisation  text,
  role          text,           -- teacher, principal, etc.
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- =============================================================
-- TIMETABLES
-- Each timetable is a simple Mon–Fri weekly layout.
-- Owned by one user; others access via timetable_members.
-- =============================================================

create table timetables (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles (id) on delete cascade,
  name            text not null,
  description     text,
  setup_complete  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- =============================================================
-- TIMETABLE MEMBERS
-- Controls who can access a timetable beyond the owner.
--   admin  — can edit the timetable and manage members
--   viewer — read-only access
-- The owner is not stored here; ownership is checked via
-- timetables.owner_id.
-- =============================================================

create table timetable_members (
  id            uuid primary key default uuid_generate_v4(),
  timetable_id  uuid not null references timetables (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  role          member_role not null default 'viewer',
  invited_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),

  unique (timetable_id, user_id)
);


-- =============================================================
-- INVITATIONS
-- An admin adds an email address to a timetable.
-- When that person signs up, a trigger automatically converts
-- the invitation into a timetable_members row.
-- accepted_at is null while pending, set when auto-converted.
-- =============================================================

create table invitations (
  id            uuid primary key default uuid_generate_v4(),
  timetable_id  uuid not null references timetables (id) on delete cascade,
  invited_by    uuid not null references profiles (id) on delete cascade,
  email         text not null,
  role          member_role not null default 'viewer',
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),

  unique (timetable_id, email)
);


-- =============================================================
-- PEOPLE
-- Staff / individuals being scheduled in the timetable.
-- These are scheduling subjects, not necessarily app users.
-- =============================================================

create table people (
  id            uuid primary key default uuid_generate_v4(),
  timetable_id  uuid not null references timetables (id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);


-- =============================================================
-- CLASSES
-- Subjects / activities with a display colour.
-- =============================================================

create table classes (
  id            uuid primary key default uuid_generate_v4(),
  timetable_id  uuid not null references timetables (id) on delete cascade,
  name          text not null,
  color         text not null default '#2a5c4e',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);


-- =============================================================
-- TIME SLOTS
-- Ordered periods in the school day (class, recess, lunch, break).
-- =============================================================

create table time_slots (
  id            uuid primary key default uuid_generate_v4(),
  timetable_id  uuid not null references timetables (id) on delete cascade,
  label         text,
  start_time    time not null,
  end_time      time not null,
  type          slot_type not null default 'class',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);


-- =============================================================
-- ASSIGNMENTS
-- One row = one person assigned to one class in one time slot
-- on one day of the week.
-- The unique constraint enforces that a person can only be in
-- one class per slot per day (can't be in two places at once).
-- =============================================================

create table assignments (
  id            uuid primary key default uuid_generate_v4(),
  timetable_id  uuid not null references timetables (id) on delete cascade,
  time_slot_id  uuid not null references time_slots (id) on delete cascade,
  person_id     uuid not null references people (id) on delete cascade,
  class_id      uuid not null references classes (id) on delete cascade,
  day           day_of_week not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (timetable_id, time_slot_id, person_id, day)
);


-- =============================================================
-- TRIGGERS
-- =============================================================

-- Reusable updated_at function
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

create trigger timetables_updated_at
  before update on timetables
  for each row execute function handle_updated_at();

create trigger assignments_updated_at
  before update on assignments
  for each row execute function handle_updated_at();

-- Auto-create profile from signup metadata
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, first_name, last_name, full_name, organisation, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'organisation',
    new.raw_user_meta_data ->> 'role'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-accept pending invitations when a matching user signs up.
-- Finds any invitations for the new user's email and creates
-- timetable_members rows, then marks the invitations as accepted.
create or replace function accept_pending_invitations()
returns trigger as $$
begin
  -- Create member rows for every pending invitation matching this email
  insert into timetable_members (timetable_id, user_id, role, invited_by)
  select
    i.timetable_id,
    new.id,
    i.role,
    i.invited_by
  from invitations i
  where lower(i.email)       = lower(new.email)
    and i.accepted_at        is null
  on conflict (timetable_id, user_id) do nothing;

  -- Mark those invitations as accepted
  update invitations
  set accepted_at = now()
  where lower(email)  = lower(new.email)
    and accepted_at   is null;

  return new;
end;
$$ language plpgsql security definer;

-- Fires on auth.users so we have access to the email address
create trigger on_auth_user_invitation_accept
  after insert on auth.users
  for each row execute function accept_pending_invitations();


-- =============================================================
-- RLS HELPER FUNCTIONS
-- =============================================================

-- True if user owns or is a member of the timetable
create or replace function is_timetable_member(t_id uuid, u_id uuid)
returns boolean as $$
  select exists (
    select 1 from timetables
      where id = t_id and owner_id = u_id
    union all
    select 1 from timetable_members
      where timetable_id = t_id and user_id = u_id
  );
$$ language sql security definer stable;

-- True if user owns the timetable OR is an admin member
create or replace function is_timetable_admin(t_id uuid, u_id uuid)
returns boolean as $$
  select exists (
    select 1 from timetables
      where id = t_id and owner_id = u_id
    union all
    select 1 from timetable_members
      where timetable_id = t_id and user_id = u_id and role = 'admin'
  );
$$ language sql security definer stable;


-- =============================================================
-- ROW LEVEL SECURITY
-- RLS is enabled on every table.
-- The anon role has zero access — a valid session is required.
-- =============================================================

alter table profiles           enable row level security;
alter table timetables         enable row level security;
alter table timetable_members  enable row level security;
alter table invitations        enable row level security;
alter table people             enable row level security;
alter table classes            enable row level security;
alter table time_slots         enable row level security;
alter table assignments        enable row level security;


-- ── profiles ─────────────────────────────────────────────────

create policy "profiles: read own"
  on profiles for select
  using (auth.uid() = id);

-- Can read profiles of people who share a timetable with you
-- (so you can show names in the members list)
create policy "profiles: read co-members"
  on profiles for select
  using (
    exists (
      select 1
      from timetable_members tm1
      join timetable_members tm2 on tm1.timetable_id = tm2.timetable_id
      where tm1.user_id = auth.uid()
        and tm2.user_id = profiles.id
    )
  );

create policy "profiles: insert own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on profiles for update
  using (auth.uid() = id);


-- ── timetables ───────────────────────────────────────────────

create policy "timetables: read if member"
  on timetables for select
  using (is_timetable_member(id, auth.uid()));

create policy "timetables: insert own"
  on timetables for insert
  with check (auth.uid() = owner_id);

create policy "timetables: update if admin"
  on timetables for update
  using (is_timetable_admin(id, auth.uid()));

create policy "timetables: delete if owner"
  on timetables for delete
  using (auth.uid() = owner_id);


-- ── timetable_members ────────────────────────────────────────

create policy "members: read if member of same timetable"
  on timetable_members for select
  using (is_timetable_member(timetable_id, auth.uid()));

create policy "members: insert if admin"
  on timetable_members for insert
  with check (is_timetable_admin(timetable_id, auth.uid()));

create policy "members: update role if admin"
  on timetable_members for update
  using (is_timetable_admin(timetable_id, auth.uid()));

-- Admin can remove anyone; members can remove themselves
create policy "members: delete if admin or self"
  on timetable_members for delete
  using (
    is_timetable_admin(timetable_id, auth.uid())
    or user_id = auth.uid()
  );


-- ── invitations ──────────────────────────────────────────────

create policy "invitations: read if admin"
  on invitations for select
  using (is_timetable_admin(timetable_id, auth.uid()));

create policy "invitations: insert if admin"
  on invitations for insert
  with check (is_timetable_admin(timetable_id, auth.uid()));

create policy "invitations: delete if admin"
  on invitations for delete
  using (is_timetable_admin(timetable_id, auth.uid()));


-- ── people ───────────────────────────────────────────────────

create policy "people: read if member"
  on people for select
  using (is_timetable_member(timetable_id, auth.uid()));

create policy "people: insert if admin"
  on people for insert
  with check (is_timetable_admin(timetable_id, auth.uid()));

create policy "people: update if admin"
  on people for update
  using (is_timetable_admin(timetable_id, auth.uid()));

create policy "people: delete if admin"
  on people for delete
  using (is_timetable_admin(timetable_id, auth.uid()));


-- ── classes ──────────────────────────────────────────────────

create policy "classes: read if member"
  on classes for select
  using (is_timetable_member(timetable_id, auth.uid()));

create policy "classes: insert if admin"
  on classes for insert
  with check (is_timetable_admin(timetable_id, auth.uid()));

create policy "classes: update if admin"
  on classes for update
  using (is_timetable_admin(timetable_id, auth.uid()));

create policy "classes: delete if admin"
  on classes for delete
  using (is_timetable_admin(timetable_id, auth.uid()));


-- ── time_slots ───────────────────────────────────────────────

create policy "time_slots: read if member"
  on time_slots for select
  using (is_timetable_member(timetable_id, auth.uid()));

create policy "time_slots: insert if admin"
  on time_slots for insert
  with check (is_timetable_admin(timetable_id, auth.uid()));

create policy "time_slots: update if admin"
  on time_slots for update
  using (is_timetable_admin(timetable_id, auth.uid()));

create policy "time_slots: delete if admin"
  on time_slots for delete
  using (is_timetable_admin(timetable_id, auth.uid()));


-- ── assignments ──────────────────────────────────────────────

create policy "assignments: read if member"
  on assignments for select
  using (is_timetable_member(timetable_id, auth.uid()));

create policy "assignments: insert if admin"
  on assignments for insert
  with check (is_timetable_admin(timetable_id, auth.uid()));

create policy "assignments: update if admin"
  on assignments for update
  using (is_timetable_admin(timetable_id, auth.uid()));

create policy "assignments: delete if admin"
  on assignments for delete
  using (is_timetable_admin(timetable_id, auth.uid()));
