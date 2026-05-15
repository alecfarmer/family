import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decryptPassword } from "@/lib/crypto";
import { logAccess } from "@/lib/accessLog";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await sb
    .from("credentials")
    .select("id, household_id, password_encrypted")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let password: string;
  try {
    password = decryptPassword(row.password_encrypted);
  } catch {
    return NextResponse.json(
      { error: "Could not decrypt credential" },
      { status: 500 },
    );
  }

  await logAccess({
    action: "viewed_credential",
    resourceId: id,
    resourceType: "credential",
    householdId: row.household_id ?? undefined,
  });

  return NextResponse.json({ password });
}
