-- 0010_credential_admin_notes.sql
-- Private admin-only memory per credential — separate from credentials.notes
-- so it never reaches the AI chat system prompt (lib/chatContext.ts reads
-- from credentials.* and is unaware of this table).
--
-- Same gate as billing: app admins, plus household admins for the
-- credential's household. Shared (household_id IS NULL) credentials are
-- app-admin-only because can_admin_credential_billing()'s inner join on
-- household_members can't match a null household.

create table if not exists public.credential_admin_notes (
  credential_id uuid primary key references public.credentials(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

drop trigger if exists trg_credential_admin_notes_updated on public.credential_admin_notes;
create trigger trg_credential_admin_notes_updated
  before update on public.credential_admin_notes
  for each row execute function public.set_updated_at();

alter table public.credential_admin_notes enable row level security;

drop policy if exists credential_admin_notes_read on public.credential_admin_notes;
create policy credential_admin_notes_read on public.credential_admin_notes
  for select using (public.can_admin_credential_billing(credential_id));

drop policy if exists credential_admin_notes_write on public.credential_admin_notes;
create policy credential_admin_notes_write on public.credential_admin_notes
  for all
  using (public.can_admin_credential_billing(credential_id))
  with check (public.can_admin_credential_billing(credential_id));
