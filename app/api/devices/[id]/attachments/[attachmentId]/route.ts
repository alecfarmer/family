import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { logAccess } from "@/lib/accessLog";
import {
  DEVICE_ATTACHMENTS_BUCKET,
  canManageDeviceAttachments,
  type DeviceAttachmentRow,
} from "@/lib/deviceAttachments";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id: deviceId, attachmentId } = await params;

  const { allowed, householdId } = await canManageDeviceAttachments(deviceId);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sb = await createSupabaseServer();

  // Fetch the row first so we have the storage_path to clean up. RLS still
  // protects the read — a non-admin from another household won't see it.
  const { data: row, error: fetchError } = await sb
    .from("device_attachments" as never)
    .select("id, device_id, storage_path, file_name")
    .eq("id", attachmentId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const attachment = row as unknown as Pick<
    DeviceAttachmentRow,
    "id" | "device_id" | "storage_path" | "file_name"
  >;

  // Remove the storage object first via service-role. If the row delete
  // later fails, the worst case is an orphaned DB row pointing at a missing
  // file — which is much safer than the reverse (orphaned file with no
  // metadata row, which would be invisible to the app).
  const { error: removeError } = await supabaseService.storage
    .from(DEVICE_ATTACHMENTS_BUCKET)
    .remove([attachment.storage_path]);

  if (removeError) {
    return NextResponse.json(
      { error: "storage_delete_failed", detail: removeError.message },
      { status: 500 },
    );
  }

  const { error: deleteError } = await sb
    .from("device_attachments" as never)
    .delete()
    .eq("id", attachmentId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  await logAccess({
    action: "device_attachment_delete",
    resourceId: attachmentId,
    resourceType: "device_attachment",
    householdId: householdId ?? undefined,
    metadata: {
      device_id: deviceId,
      file_name: attachment.file_name,
    },
  });

  return new NextResponse(null, { status: 204 });
}
