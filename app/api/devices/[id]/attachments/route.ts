import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { logAccess } from "@/lib/accessLog";
import {
  DEVICE_ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_BYTES,
  SIGNED_URL_TTL_SECONDS,
  canManageDeviceAttachments,
  isAllowedAttachmentMime,
  sanitizeFileName,
  type DeviceAttachmentListItem,
  type DeviceAttachmentRow,
} from "@/lib/deviceAttachments";

// ---------------------------------------------------------------------------
// GET: list attachments for the device + signed URLs.
// RLS on `device_attachments` filters to rows the user can see, so a member
// of another household quietly gets an empty list rather than a 403.
// ---------------------------------------------------------------------------
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: deviceId } = await params;
  const { sb } = await requireUser();

  // Confirm the device is visible to the caller — otherwise even an empty
  // attachment list would leak existence.
  const { data: device } = await sb
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .maybeSingle();
  if (!device) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data, error } = await sb
    .from("device_attachments" as never)
    .select(
      "id, device_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at",
    )
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as DeviceAttachmentRow[];

  // Signed URLs in parallel — one round-trip per file is acceptable here
  // since the list is small (manuals/photos for a single device), and they're
  // independent of each other.
  const signed = await Promise.all(
    rows.map((row) =>
      supabaseService.storage
        .from(DEVICE_ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS),
    ),
  );

  const items: DeviceAttachmentListItem[] = rows.map((row, idx) => ({
    id: row.id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
    url: signed[idx]?.data?.signedUrl ?? "",
  }));

  return NextResponse.json({ attachments: items });
}

// ---------------------------------------------------------------------------
// POST: multipart upload. Validates auth + permission BEFORE touching the
// service-role client. Sequence is important — service-role bypasses RLS,
// so we own every gate ourselves.
// ---------------------------------------------------------------------------
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: deviceId } = await params;
  const { profile } = await requireUser();

  const { allowed, householdId } = await canManageDeviceAttachments(deviceId);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_multipart" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", max_bytes: MAX_ATTACHMENT_BYTES },
      { status: 413 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!isAllowedAttachmentMime(mime)) {
    return NextResponse.json(
      { error: "unsupported_mime", mime },
      { status: 415 },
    );
  }

  // `File` extends `Blob` and carries the original filename — fall back to
  // "file" when the picker hands us a raw Blob (shouldn't happen, but the
  // type narrowing makes it explicit).
  const originalName =
    file instanceof File && file.name ? file.name : "file";
  const sanitized = sanitizeFileName(originalName);
  const storagePath = `${deviceId}/${crypto.randomUUID()}-${sanitized}`;

  // 1) Upload via service-role — the storage-write policy only requires an
  //    authenticated user, but we've already verified household-admin status
  //    via canManageDeviceAttachments() above.
  const arrayBuf = await file.arrayBuffer();
  const { error: uploadError } = await supabaseService.storage
    .from(DEVICE_ATTACHMENTS_BUCKET)
    .upload(storagePath, arrayBuf, {
      contentType: mime,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: "upload_failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  // 2) Insert the metadata row under the user's auth context so RLS
  //    double-checks the household_admin gate. If this fails, clean up the
  //    orphaned storage object before returning.
  const sb = await createSupabaseServer();
  const { data: inserted, error: insertError } = await sb
    .from("device_attachments" as never)
    .insert({
      device_id: deviceId,
      storage_path: storagePath,
      file_name: originalName.slice(0, 255),
      mime_type: mime,
      size_bytes: file.size,
      uploaded_by: profile.id,
    } as never)
    .select(
      "id, device_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at",
    )
    .single();

  if (insertError || !inserted) {
    // Orphan cleanup — best effort, log but don't block the error response.
    await supabaseService.storage
      .from(DEVICE_ATTACHMENTS_BUCKET)
      .remove([storagePath])
      .catch(() => {});
    return NextResponse.json(
      { error: insertError?.message ?? "insert_failed" },
      { status: 500 },
    );
  }

  const row = inserted as unknown as DeviceAttachmentRow;

  // 3) Signed URL so the client can render immediately without a refetch.
  const { data: signed } = await supabaseService.storage
    .from(DEVICE_ATTACHMENTS_BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

  await logAccess({
    action: "device_attachment_create",
    resourceId: row.id,
    resourceType: "device_attachment",
    householdId: householdId ?? undefined,
    metadata: {
      device_id: deviceId,
      file_name: row.file_name,
      size_bytes: row.size_bytes,
    },
  });

  const item: DeviceAttachmentListItem = {
    id: row.id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
    url: signed?.signedUrl ?? "",
  };

  return NextResponse.json({ attachment: item }, { status: 201 });
}
