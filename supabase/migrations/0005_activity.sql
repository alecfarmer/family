-- 0005_activity.sql
-- Activity Center (Phase 6.5): tracks the last time a user dismissed/read the
-- activity feed. Unread items are derived by comparing this timestamp against
-- the created_at columns of underlying tables (help_requests, credentials,
-- devices.warranty_expiry, access_log, household_members).

alter table public.users
  add column if not exists last_seen_activity timestamptz
    not null default '1970-01-01'::timestamptz;
