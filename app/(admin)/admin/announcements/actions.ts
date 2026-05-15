"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";

// `announcements` isn't yet in `lib/supabase/types.ts` (hand-written) and
// per the task spec we can't edit that file. We narrow the client to the
// untyped SupabaseClient just for announcement queries; everything else
// keeps the typed surface.
type UntypedClient = SupabaseClient;

type AnnouncementInsert = {
  household_id: string | null;
  author_id: string;
  title: string;
  body: string;
  expires_at: string | null;
};

type AnnouncementUpdate = {
  title: string;
  body: string;
  household_id: string | null;
  expires_at: string | null;
};

// "All households" sentinel for the scope <select>. Matches the
// CredentialForm pattern (SHARED_ALL) so the UI feels familiar.
export const ALL_HOUSEHOLDS = "__all__";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(4000),
  household_id: z.string(),
  expires_at: z.string(),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid("Invalid announcement id"),
});

const deleteSchema = z.object({
  id: z.string().uuid("Invalid announcement id"),
});

// "" or "__all__" → null (global). Specific uuid → that household.
function normalizeScope(value: string): string | null {
  if (!value || value === ALL_HOUSEHOLDS) return null;
  return value;
}

// <input type="date"> → "YYYY-MM-DD". Empty string is "never expires".
// We append T23:59:59Z so the announcement stays visible through the
// chosen day in any timezone — without this an admin picking "today"
// would see the row vanish immediately at midnight UTC.
function normalizeExpiry(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${trimmed}T23:59:59Z`;
}

// Strip the T23:59:59Z suffix we add on write so the date input can
// round-trip the stored value back into a "YYYY-MM-DD" form value.
export function expiryToDateInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export type AnnouncementActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createAnnouncement(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  const { user, sb } = await requireUser();

  const parsed = createSchema.safeParse({
    title: formData.get("title")?.toString() ?? "",
    body: formData.get("body")?.toString() ?? "",
    household_id: formData.get("household_id")?.toString() ?? "",
    expires_at: formData.get("expires_at")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const row: AnnouncementInsert = {
    household_id: normalizeScope(parsed.data.household_id),
    author_id: user.id,
    title: parsed.data.title.trim(),
    body: parsed.data.body.trim(),
    expires_at: normalizeExpiry(parsed.data.expires_at),
  };

  // RLS scopes inserts. Household admins posting to a household they don't
  // administer (or a global announcement) will hit `with check` and fail
  // here with the Postgres-side message.
  const client = sb as unknown as UntypedClient;
  const { error } = await client.from("announcements").insert(row);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/activity");
  return { ok: true };
}

export async function updateAnnouncement(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  const { sb } = await requireUser();

  const parsed = updateSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    body: formData.get("body")?.toString() ?? "",
    household_id: formData.get("household_id")?.toString() ?? "",
    expires_at: formData.get("expires_at")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const patch: AnnouncementUpdate = {
    title: parsed.data.title.trim(),
    body: parsed.data.body.trim(),
    household_id: normalizeScope(parsed.data.household_id),
    expires_at: normalizeExpiry(parsed.data.expires_at),
  };

  const client = sb as unknown as UntypedClient;
  const { error } = await client
    .from("announcements")
    .update(patch)
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/activity");
  return { ok: true };
}

export async function deleteAnnouncement(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  const { sb } = await requireUser();

  const parsed = deleteSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid id" };
  }

  const client = sb as unknown as UntypedClient;
  const { error } = await client
    .from("announcements")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/activity");
  return { ok: true };
}
