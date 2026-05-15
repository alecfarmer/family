import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { env } from "@/lib/env";

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  role: z.enum(["member", "admin"]),
  householdIds: z.array(z.string().uuid()).default([]),
});

export async function GET() {
  await requireAdmin();
  // Fetch all public users + their household memberships
  const { data: users, error: usersError } = await supabaseService
    .from("users")
    .select("id, full_name, role, created_at")
    .order("full_name");
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const { data: memberships, error: membershipsError } = await supabaseService
    .from("household_members")
    .select("user_id, household_id");
  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

  // Join email from auth.users
  const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }
  const emailMap = new Map<string, string>();
  for (const u of authUsers.users) {
    if (u.email) emailMap.set(u.id, u.email);
  }

  const membershipsByUser = new Map<string, string[]>();
  for (const m of memberships ?? []) {
    const existing = membershipsByUser.get(m.user_id) ?? [];
    existing.push(m.household_id);
    membershipsByUser.set(m.user_id, existing);
  }

  const result = (users ?? []).map((u) => ({
    ...u,
    email: emailMap.get(u.id) ?? null,
    household_ids: membershipsByUser.get(u.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  await requireAdmin();
  const json = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { email, fullName, role, householdIds } = parsed.data;

  // Invite via Supabase Auth
  const { data: invited, error: inviteError } =
    await supabaseService.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  const userId = invited.user.id;

  // Upsert public profile (guard re-invite duplicate)
  const { error: profileError } = await supabaseService.from("users").upsert(
    { id: userId, full_name: fullName, role },
    { onConflict: "id" },
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Add to households
  if (householdIds.length > 0) {
    const rows = householdIds.map((household_id) => ({
      household_id,
      user_id: userId,
    }));
    const { error: hmError } = await supabaseService
      .from("household_members")
      .upsert(rows, { onConflict: "household_id,user_id" });
    if (hmError) {
      return NextResponse.json({ error: hmError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: userId }, { status: 201 });
}
