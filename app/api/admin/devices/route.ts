import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { logAccess } from "@/lib/accessLog";

const deviceTypeEnum = z.enum([
  "tv",
  "router",
  "modem",
  "phone",
  "tablet",
  "laptop",
  "desktop",
  "smart_home",
  "other",
]);

const createSchema = z.object({
  household_id: z.string().min(1),
  name: z.string().min(1),
  type: deviceTypeEnum,
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional(),
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

  const { data: device, error } = await sb
    .from("devices")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error || !device) {
    return NextResponse.json(
      { error: error?.message ?? "insert_failed" },
      { status: 500 },
    );
  }

  await logAccess({
    action: "admin_device_create",
    resourceId: device.id,
    resourceType: "device",
    householdId: parsed.data.household_id,
  });

  return NextResponse.json({ ok: true, id: device.id });
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

  const { error } = await sb.from("devices").update(rest).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAccess({
    action: "admin_device_update",
    resourceId: id,
    resourceType: "device",
    householdId: rest.household_id,
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

  const { error } = await sb.from("devices").delete().eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAccess({
    action: "admin_device_delete",
    resourceId: parsed.data.id,
    resourceType: "device",
  });

  return NextResponse.json({ ok: true });
}
