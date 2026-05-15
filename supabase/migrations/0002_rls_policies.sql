-- 0002_rls_policies.sql
-- Enable Row Level Security on every public table and install the policies
-- described in the implementation plan. Two helper functions (`is_admin()`
-- and `my_household_ids()`) make the policies readable.

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.credentials enable row level security;
alter table public.devices enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.help_requests enable row level security;
alter table public.access_log enable row level security;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- helper: is current user an admin?
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  )
$$;

-- helper: household IDs the current user belongs to
create or replace function public.my_household_ids() returns setof uuid
  language sql stable security definer set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- users: self can read own row; admin reads/writes all
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- households: members of the household + admin
drop policy if exists households_read on public.households;
create policy households_read on public.households
  for select using (
    public.is_admin() or id in (select public.my_household_ids())
  );

drop policy if exists households_admin_write on public.households;
create policy households_admin_write on public.households
  for all using (public.is_admin()) with check (public.is_admin());

-- household_members: members can see roster of their households
drop policy if exists hm_read on public.household_members;
create policy hm_read on public.household_members
  for select using (
    public.is_admin() or household_id in (select public.my_household_ids())
  );

drop policy if exists hm_admin_write on public.household_members;
create policy hm_admin_write on public.household_members
  for all using (public.is_admin()) with check (public.is_admin());

-- credentials: members of the household OR shared; admin all
drop policy if exists credentials_read on public.credentials;
create policy credentials_read on public.credentials
  for select using (
    public.is_admin()
    or is_shared = true
    or household_id in (select public.my_household_ids())
  );

drop policy if exists credentials_admin_write on public.credentials;
create policy credentials_admin_write on public.credentials
  for all using (public.is_admin()) with check (public.is_admin());

-- devices: members of the household; admin all
drop policy if exists devices_read on public.devices;
create policy devices_read on public.devices
  for select using (
    public.is_admin() or household_id in (select public.my_household_ids())
  );

drop policy if exists devices_admin_write on public.devices;
create policy devices_admin_write on public.devices
  for all using (public.is_admin()) with check (public.is_admin());

-- knowledge_base: members + shared (null household_id); admin all
drop policy if exists kb_read on public.knowledge_base;
create policy kb_read on public.knowledge_base
  for select using (
    public.is_admin()
    or household_id is null
    or household_id in (select public.my_household_ids())
  );

drop policy if exists kb_admin_write on public.knowledge_base;
create policy kb_admin_write on public.knowledge_base
  for all using (public.is_admin()) with check (public.is_admin());

-- help_requests: owner + admin
drop policy if exists hr_read on public.help_requests;
create policy hr_read on public.help_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists hr_insert_own on public.help_requests;
create policy hr_insert_own on public.help_requests
  for insert with check (user_id = auth.uid());

drop policy if exists hr_admin_update on public.help_requests;
create policy hr_admin_update on public.help_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- access_log: owner reads own; admin all; anyone can insert their own
drop policy if exists log_read on public.access_log;
create policy log_read on public.access_log
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists log_insert_own on public.access_log;
create policy log_insert_own on public.access_log
  for insert with check (user_id = auth.uid());
