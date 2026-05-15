import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { logAccess } from "@/lib/accessLog";

const bodySchema = z.object({
  resolved_notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const sb = await createSupabaseServer();

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { error } = await sb
    .from("help_requests")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_notes: parsed.data.resolved_notes ?? null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAccess({
    action: "admin_help_resolve",
    resourceId: id,
    resourceType: "help_request",
  });

  return NextResponse.json({ ok: true });
}
