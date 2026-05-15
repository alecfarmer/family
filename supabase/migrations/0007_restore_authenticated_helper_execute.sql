-- 0007_restore_authenticated_helper_execute.sql
-- Fix for an infinite /login redirect loop after sign-in.
--
-- 0006 revoked EXECUTE on is_admin() / my_household_ids() from authenticated
-- to satisfy the security linter. But every RLS policy on users/households/
-- credentials/etc. evaluates `id = auth.uid() OR public.is_admin()`, and
-- Postgres requires EXECUTE on the helper to evaluate the OR clause even
-- when the first side short-circuits. With EXECUTE revoked, requireUser()
-- couldn't read the signed-in user's own profile row and redirected them
-- back to /login indefinitely.
--
-- Anon stays revoked: anon's auth.uid() is null so all policies fail for
-- them regardless.

grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_household_ids() to authenticated;
