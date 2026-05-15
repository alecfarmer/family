-- 0009_announcements.sql
-- In-app announcements that Alec (app admin) and household admins post for
-- their family. Reads are scoped via RLS — global announcements
-- (household_id IS NULL) are visible to everyone, household-scoped ones only
-- to members of that household. Writes mirror the credential_billing
-- pattern: app admins can write anything; household admins can only post
-- to households they administer.

create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists announcements_household_created_idx
  on public.announcements (household_id, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select using (
    public.is_admin()
    or household_id is null
    or household_id in (select public.my_household_ids())
  );

drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements
  for all
  using (
    public.is_admin()
    or household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and is_household_admin = true
    )
  )
  with check (
    public.is_admin()
    or household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and is_household_admin = true
    )
  );
