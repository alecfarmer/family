import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { setActiveHouseholdCookieValue } from "@/lib/activeHousehold";

const bodySchema = z.object({
  value: z.union([z.literal("all"), z.string().uuid()]),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const value = parsed.data.value;

  // For UUID values, confirm membership before persisting. We don't want a
  // stale or copy-pasted ID lingering in the cookie.
  if (value !== "all") {
    const { data } = await sb
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("household_id", value)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "not_a_member" }, { status: 403 });
    }
  }

  await setActiveHouseholdCookieValue(value);
  return NextResponse.json({ ok: true });
}
