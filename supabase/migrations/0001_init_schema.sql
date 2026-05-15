-- 0001_init_schema.sql
-- Initial schema for the Family app. Creates extensions, enum types, all 8 base
-- tables (users, households, household_members, credentials, devices,
-- knowledge_base, help_requests, access_log), supporting indexes, and the
-- updated_at trigger.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'credential_category') then
    create type credential_category as enum (
      'internet', 'mobile', 'streaming', 'smart_home', 'utilities', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'device_type') then
    create type device_type as enum (
      'tv', 'router', 'modem', 'phone', 'tablet', 'laptop',
      'desktop', 'smart_home', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'help_status') then
    create type help_status as enum ('open', 'resolved');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  is_household_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index if not exists household_members_user_id_idx
  on household_members (user_id);

create table if not exists public.credentials (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade, -- null = shared
  category credential_category not null default 'other',
  service_name text not null,
  username text,
  password_encrypted text not null,  -- base64(iv|tag|ciphertext)
  url text,
  notes text,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists credentials_household_id_idx
  on credentials (household_id);

create table if not exists public.devices (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  type device_type not null default 'other',
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists devices_household_id_idx
  on devices (household_id);

create table if not exists public.knowledge_base (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade, -- null = all
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_base_household_id_idx
  on knowledge_base (household_id);

create table if not exists public.help_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  household_id uuid references households(id),
  message text not null,                                  -- AI-distilled one-line summary
  chat_transcript jsonb not null default '[]'::jsonb,     -- full [{role, content, createdAt}] when escalated from chat
  source text not null default 'chat',                    -- 'chat' | 'help_page'
  status help_status not null default 'open',
  resolved_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists help_requests_status_created_idx
  on help_requests (status, created_at desc);

create table if not exists public.access_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  household_id uuid references households(id) on delete set null,
  action text not null,
  resource_id uuid,
  resource_type text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists access_log_user_created_idx
  on access_log (user_id, created_at desc);
create index if not exists access_log_action_idx
  on access_log (action);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_credentials_updated on credentials;
create trigger trg_credentials_updated
  before update on credentials
  for each row execute function set_updated_at();

drop trigger if exists trg_knowledge_updated on knowledge_base;
create trigger trg_knowledge_updated
  before update on knowledge_base
  for each row execute function set_updated_at();
