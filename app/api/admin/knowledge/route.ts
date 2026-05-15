import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { logAccess } from "@/lib/accessLog";

const createSchema = z.object({
  household_id: z.string().nullable(),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()),
});

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function POST(req: Request) {
  await requireAdmin();
  const sb = await createSupabaseServer();

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: entry, error } = await sb
    .from("knowledge_base")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !entry) {
    return NextResponse.json(
      { error: error?.message ?? "insert_failed" },
      { status: 500 },
    );
  }

  await logAccess({
    action: "admin_knowledge_create",
    resourceId: entry.id,
    resourceType: "knowledge_base",
    householdId: parsed.data.household_id ?? undefined,
  });

  return NextResponse.json({ ok: true, id: entry.id });
}

export async function PUT(req: Request) {
  await requireAdmin();
  const sb = await createSupabaseServer();

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id, ...rest } = parsed.data;

  const { error } = await sb.from("knowledge_base").update(rest).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAccess({
    action: "admin_knowledge_update",
    resourceId: id,
    resourceType: "knowledge_base",
    householdId: rest.household_id ?? undefined,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const sb = await createSupabaseServer();

  const json = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { error } = await sb
    .from("knowledge_base")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAccess({
    action: "admin_knowledge_delete",
    resourceId: parsed.data.id,
    resourceType: "knowledge_base",
  });

  return NextResponse.json({ ok: true });
}
