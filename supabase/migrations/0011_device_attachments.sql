-- 0011_device_attachments.sql
-- Members of a household can view file attachments (PDFs, images, text)
-- linked to a device — manuals, warranty receipts, photos. App admins and
-- household admins for the device's household can upload + delete. Files
-- live in the private `device-attachments` Storage bucket; this table holds
-- the metadata + the storage object key. RLS mirrors the pattern from
-- 0008/0009: app admins everywhere; household admins only within their own
-- household.

create table public.device_attachments (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid not null references devices(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on device_attachments (device_id, created_at desc);
alter table device_attachments enable row level security;

create policy device_attachments_read on device_attachments for select
  using (
    is_admin()
    or exists (
      select 1 from devices d
      where d.id = device_id and d.household_id in (select my_household_ids())
    )
  );

create policy device_attachments_write on device_attachments for all
  using (
    is_admin()
    or exists (
      select 1 from devices d
      join household_members hm on hm.household_id = d.household_id
      where d.id = device_id
        and hm.user_id = auth.uid()
        and hm.is_household_admin = true
    )
  ) with check (
    is_admin()
    or exists (
      select 1 from devices d
      join household_members hm on hm.household_id = d.household_id
      where d.id = device_id
        and hm.user_id = auth.uid()
        and hm.is_household_admin = true
    )
  );

create policy "device_attachments_storage_read" on storage.objects for select
  using (
    bucket_id = 'device-attachments' and (
      is_admin()
      or exists (
        select 1 from device_attachments da
        join devices d on d.id = da.device_id
        where da.storage_path = storage.objects.name
          and d.household_id in (select my_household_ids())
      )
    )
  );

create policy "device_attachments_storage_write" on storage.objects for insert
  with check (bucket_id = 'device-attachments' and auth.uid() is not null);

create policy "device_attachments_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'device-attachments' and (
      is_admin()
      or exists (
        select 1 from device_attachments da
        join devices d on d.id = da.device_id
        join household_members hm on hm.household_id = d.household_id
        where da.storage_path = storage.objects.name
          and hm.user_id = auth.uid()
          and hm.is_household_admin = true
      )
    )
  );
