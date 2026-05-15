import "server-only";
import { requireUser } from "@/lib/auth";

// Local row type — device_attachments isn't in the generated Database type yet
// (per CLAUDE.md: don't touch lib/supabase/types.ts). Casting the table name
// when calling .from() and shaping the result through this type keeps every
// callsite consistent.
export type DeviceAttachmentRow = {
  id: string;
  device_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
};

// Public listing shape returned by the GET route and rendered by the
// AttachmentSection client. Signed URL is server-generated and short-lived.
export type DeviceAttachmentListItem = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url: string;
};

export const DEVICE_ATTACHMENTS_BUCKET = "device-attachments";
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_ATTACHMENT_PREFIXES = ["image/"] as const;
export const ALLOWED_ATTACHMENT_EXACT = [
  "application/pdf",
  "text/plain",
] as const;

export function isAllowedAttachmentMime(mime: string): boolean {
  const lower = mime.toLowerCase();
  if (ALLOWED_ATTACHMENT_EXACT.includes(lower as (typeof ALLOWED_ATTACHMENT_EXACT)[number])) {
    return true;
  }
  return ALLOWED_ATTACHMENT_PREFIXES.some((p) => lower.startsWith(p));
}

/**
 * Strip path separators and anything outside `[a-zA-Z0-9._-]`. Collapse
 * leading dots so we don't end up with `..something`. Cap at 100 chars.
 * Falls back to "file" when sanitization eats everything (e.g. all-emoji
 * names).
 */
export function sanitizeFileName(original: string): string {
  const noPath = original.replace(/[/\\]/g, "_");
  let cleaned = noPath.replace(/[^a-zA-Z0-9._-]/g, "_");
  cleaned = cleaned.replace(/^\.+/, "");
  cleaned = cleaned.slice(0, 100);
  return cleaned.length > 0 ? cleaned : "file";
}

/**
 * Can the signed-in user upload/delete attachments for this device?
 *   - app admins (users.role = 'admin') → always true
 *   - household admins for the device's household → true
 * Used by the API routes before any write AND by the detail page to decide
 * whether to render the management UI. RLS still enforces this at the DB
 * level — this is a friendlier gate that returns 403 early.
 */
export async function canManageDeviceAttachments(
  deviceId: string,
): Promise<{ allowed: boolean; householdId: string | null }> {
  const { profile, sb } = await requireUser();

  const { data: device } = await sb
    .from("devices")
    .select("id, household_id")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device) return { allowed: false, householdId: null };

  if (profile.role === "admin") {
    return { allowed: true, householdId: device.household_id };
  }

  const { data: membership } = await sb
    .from("household_members")
    .select("id")
    .eq("user_id", profile.id)
    .eq("household_id", device.household_id)
    .eq("is_household_admin", true)
    .limit(1)
    .maybeSingle();

  return { allowed: !!membership, householdId: device.household_id };
}

/**
 * Format a byte count as "1.4 MB", "812 KB", "640 B".
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
