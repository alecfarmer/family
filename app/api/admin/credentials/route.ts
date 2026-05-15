import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { encryptPassword } from "@/lib/crypto";
import { logAccess } from "@/lib/accessLog";
import type { SupabaseClient } from "@supabase/supabase-js";

const categoryEnum = z.enum([
  "internet",
  "mobile",
  "streaming",
  "smart_home",
  "utilities",
  "other",
]);

const createSchema = z.object({
  service_name: z.string().min(1).max(120),
  category: categoryEnum,
  // null = shared across all households
  household_id: z.string().uuid().nullable(),
  username: z.string().max(200).nullable().optional(),
  password_plaintext: z.string().min(1).max(4096),
  url: z.string().max(500).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  is_shared: z.boolean(),
  // Admin-only private memory; stored in a separate table that the AI
  // chat context loader does NOT read. Optional — omitted on plain logins.
  admin_notes: z.string().max(4000).optional(),
});

const updateSchema = z.object({
  service_name: z.string().min(1).max(120),
  category: categoryEnum,
  household_id: z.string().uuid().nullable(),
  username: z.string().max(200).nullable().optional(),
  // Optional on update: omit to keep the existing password.
  password_plaintext: z.string().min(1).max(4096).optional(),
  url: z.string().max(500).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  is_shared: z.boolean(),
  admin_notes: z.string().max(4000).optional(),
});

/**
 * Upsert (or clear) the admin-only private notes row for a credential.
 * Mirrors how the billing route handles an "empty means clear" textarea:
 * empty string deletes the row, anything else writes/replaces it.
 *
 * Falls through silently on errors — these notes are best-effort metadata
 * and shouldn't block a successful credential save. The DB-side RLS gate
 * (`can_admin_credential_billing`) still applies on the upsert/delete.
 */
async function saveAdminNotes(
  sb: SupabaseClient,
  credentialId: string,
  userId: string,
  raw: string,
): Promise<void> {
  const value = raw.trim();
  if (value === "") {
    await sb
      .from("credential_admin_notes")
      .delete()
      .eq("credential_id", credentialId);
    return;
  }
  await sb.from("credential_admin_notes").upsert(
    {
      credential_id: credentialId,
      notes: value,
      updated_by: userId,
      // Force the trigger to bump updated_at on upsert-as-update.
      updated_at: new Date().toISOString(),
    },
    { onConflict: "credential_id" },
  );
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const { sb, profile } = await requireAdmin();

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Shared-across-all must have is_shared=true.
  if (data.household_id === null && !data.is_shared) {
    return badRequest("is_shared must be true when household_id is null");
  }

  const password_encrypted = encryptPassword(data.password_plaintext);

  const { data: row, error } = await sb
    .from("credentials")
    .insert({
      service_name: data.service_name,
      category: data.category,
      household_id: data.household_id,
      username: data.username ?? null,
      password_encrypted,
      url: data.url ?? null,
      notes: data.notes ?? null,
      is_shared: data.is_shared,
    })
    .select("id, household_id")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "insert_failed", detail: error?.message ?? "unknown" },
      { status: 500 },
    );
  }

  // Admin-only private notes — only when the client explicitly sent the field
  // (undefined means "don't touch", per billing's convention).
  if (data.admin_notes !== undefined) {
    await saveAdminNotes(sb, row.id, profile.id, data.admin_notes);
  }

  await logAccess({
    action: "admin_credential_add",
    resourceId: row.id,
    resourceType: "credential",
    householdId: row.household_id ?? undefined,
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function PUT(req: Request) {
  const { sb, profile } = await requireAdmin();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return badRequest("Missing id");

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.household_id === null && !data.is_shared) {
    return badRequest("is_shared must be true when household_id is null");
  }

  const update: {
    service_name: string;
    category: typeof data.category;
    household_id: string | null;
    username: string | null;
    url: string | null;
    notes: string | null;
    is_shared: boolean;
    password_encrypted?: string;
  } = {
    service_name: data.service_name,
    category: data.category,
    household_id: data.household_id,
    username: data.username ?? null,
    url: data.url ?? null,
    notes: data.notes ?? null,
    is_shared: data.is_shared,
  };

  // Only re-encrypt when the client actually sent a new plaintext password.
  if (data.password_plaintext && data.password_plaintext.length > 0) {
    update.password_encrypted = encryptPassword(data.password_plaintext);
  }

  const { data: row, error } = await sb
    .from("credentials")
    .update(update)
    .eq("id", id)
    .select("id, household_id")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "update_failed", detail: error?.message ?? "not found" },
      { status: 500 },
    );
  }

  if (data.admin_notes !== undefined) {
    await saveAdminNotes(sb, row.id, profile.id, data.admin_notes);
  }

  await logAccess({
    action: "admin_credential_edit",
    resourceId: row.id,
    resourceType: "credential",
    householdId: row.household_id ?? undefined,
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: Request) {
  const { sb } = await requireAdmin();

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return badRequest("Missing id");

  // Look up household_id for the access log before deleting.
  const { data: existing } = await sb
    .from("credentials")
    .select("id, household_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("credentials").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "delete_failed", detail: error.message },
      { status: 500 },
    );
  }

  await logAccess({
    action: "admin_credential_delete",
    resourceId: id,
    resourceType: "credential",
    householdId: existing?.household_id ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
