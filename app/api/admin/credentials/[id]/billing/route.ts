import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { canManageBillingFor } from "@/lib/billing";
import { logAccess } from "@/lib/accessLog";

// Body for create/update — every field is optional so the form can clear
// any subset by sending null.
const bodySchema = z.object({
  monthly_cost: z.number().min(0).max(99999.99).nullable().optional(),
  price_locked_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .nullable()
    .optional(),
  last_negotiated_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .nullable()
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Permission gate. RLS would also block the upsert, but checking here
  // returns a friendlier 403 + skips an unnecessary DB roundtrip.
  const allowed = await canManageBillingFor(id);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sb = await createSupabaseServer();

  // Upsert — one row per credential.
  const { error } = await sb
    .from("credential_billing")
    .upsert(
      {
        credential_id: id,
        monthly_cost: parsed.data.monthly_cost ?? null,
        price_locked_until: parsed.data.price_locked_until ?? null,
        last_negotiated_at: parsed.data.last_negotiated_at ?? null,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "credential_id" },
    );

  if (error) {
    return NextResponse.json(
      { error: "save_failed", detail: error.message },
      { status: 500 },
    );
  }

  await logAccess({
    action: "admin_billing_save",
    resourceId: id,
    resourceType: "credential",
    metadata: {
      monthly_cost: parsed.data.monthly_cost ?? null,
      price_locked_until: parsed.data.price_locked_until ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const allowed = await canManageBillingFor(id);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sb = await createSupabaseServer();
  const { error } = await sb
    .from("credential_billing")
    .delete()
    .eq("credential_id", id);

  if (error) {
    return NextResponse.json(
      { error: "delete_failed", detail: error.message },
      { status: 500 },
    );
  }

  await logAccess({
    action: "admin_billing_clear",
    resourceId: id,
    resourceType: "credential",
  });

  return NextResponse.json({ ok: true });
}
