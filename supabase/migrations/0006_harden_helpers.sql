-- 0006_harden_helpers.sql
-- Resolve security-linter warnings flagged after the initial migrations:
--  - set_updated_at had a role-mutable search_path
--  - is_admin() and my_household_ids() are SECURITY DEFINER and were callable
--    over /rest/v1/rpc by anon/authenticated. They are only meant to run inside
--    RLS policies, where Postgres invokes them itself.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.is_admin() from anon, authenticated, public;
revoke execute on function public.my_household_ids() from anon, authenticated, public;
grant execute on function public.is_admin() to service_role;
grant execute on function public.my_household_ids() to service_role;
