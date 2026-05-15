# Supabase

Schema, RLS, and Web Push tables for the Family app. All SQL lives under
`migrations/` and is applied with the Supabase CLI.

## One-time setup

1. Install the CLI: `pnpm dlx supabase --version` (or `brew install supabase/tap/supabase`).
2. Create a project at <https://supabase.com> (region `us-east-1` to match Vercel).
3. From the repo root:
   ```bash
   pnpm dlx supabase init           # creates supabase/config.toml on first run
   pnpm dlx supabase link --project-ref <project-ref>
   ```
4. Copy `Project URL`, `anon` key, and `service_role` key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).

## Apply migrations

```bash
pnpm dlx supabase db push
```

The migrations run in numeric order:

| File | Purpose |
| --- | --- |
| `0001_init_schema.sql` | Extensions, enums, 8 base tables, indexes, `updated_at` trigger |
| `0002_rls_policies.sql` | `is_admin()`, `my_household_ids()`, and per-table RLS policies |
| `0003_seed_admin.sql` | Documentation-only; see below |
| `0004_push_subscriptions.sql` | Web Push subscription endpoints + RLS |
| `0005_activity.sql` | Adds `users.last_seen_activity` for the Activity Center |

`0003` deliberately ships zero executable SQL — the first admin can only be
promoted after a real `auth.users` row exists.

## Promote the first admin (manual)

After James completes his first magic-link login, open the Supabase SQL editor
and run:

```sql
update public.users
set role = 'admin'
where id = (
  select id from auth.users where email = 'realalecfarmer@gmail.com'
);
```

Repeat for Alec or any other admin, swapping the email address. Members are
created automatically by the Phase 3 auth callback.

## Regenerating TypeScript types

The hand-written `lib/supabase/types.ts` matches the current migrations. Once
the project is linked, regenerate it with the real introspector:

```bash
pnpm dlx supabase gen types typescript --linked --schema public \
  > lib/supabase/types.ts
```
