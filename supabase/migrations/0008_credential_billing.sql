-- 0008_credential_billing.sql
-- Admin-only billing/negotiation tracking that sits alongside credentials
-- without changing what regular members can see. Regular members keep
-- reading the credentials table as-is (login info); only app admins and
-- household admins for the credential's household can SELECT/INSERT/UPDATE
-- on this table.
--
-- For shared credentials (household_id IS NULL) only the app admin can
-- manage billing — the can_admin_credential_billing() helper's inner join
-- doesn't match against a null household, so household admins can't reach
-- shared-family billing details.

create table if not exists public.credential_billing (
  credential_id uuid primary key references public.credentials(id) on delete cascade,
  monthly_cost numeric(10,2),
  price_locked_until date,
  last_negotiated_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credential_billing_lock_idx
  on public.credential_billing (price_locked_until)
  where price_locked_until is not null;

drop trigger if exists trg_credential_billing_updated on public.credential_billing;
create trigger trg_credential_billing_updated
  before update on public.credential_billing
  for each row execute function public.set_updated_at();

create or replace function public.can_admin_credential_billing(bill_credential_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.credentials c
      join public.household_members hm
        on hm.household_id = c.household_id
      where c.id = bill_credential_id
        and hm.user_id = auth.uid()
        and hm.is_household_admin = true
    )
$$;

revoke execute on function public.can_admin_credential_billing(uuid)
  from anon, public;
grant execute on function public.can_admin_credential_billing(uuid)
  to authenticated, service_role;

alter table public.credential_billing enable row level security;

drop policy if exists billing_admin_select on public.credential_billing;
create policy billing_admin_select on public.credential_billing
  for select using (public.can_admin_credential_billing(credential_id));

drop policy if exists billing_admin_write on public.credential_billing;
create policy billing_admin_write on public.credential_billing
  for all
  using (public.can_admin_credential_billing(credential_id))
  with check (public.can_admin_credential_billing(credential_id));
