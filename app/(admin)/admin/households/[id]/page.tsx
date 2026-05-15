import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { HouseholdDetailClient } from "./HouseholdDetailClient";

const paramsSchema = z.object({ id: z.string().uuid() });

export default async function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;

  const [{ data: household }, { data: members }, { data: allUsers }] =
    await Promise.all([
      supabaseService.from("households").select("*").eq("id", id).single(),
      supabaseService
        .from("household_members")
        .select("id, user_id, is_household_admin, users(id, full_name, role)")
        .eq("household_id", id),
      supabaseService
        .from("users")
        .select("id, full_name")
        .order("full_name"),
    ]);

  if (!household) notFound();

  type Member = {
    id: string;
    user_id: string;
    is_household_admin: boolean;
    users: { id: string; full_name: string; role: string } | null;
  };

  const memberRows = (members ?? []).map((m) => {
    const row = m as unknown as Member;
    return {
      memberId: row.id,
      userId: row.user_id,
      fullName: row.users?.full_name ?? "Unknown",
      role: (row.users?.role ?? "member") as "admin" | "member",
      isHouseholdAdmin: row.is_household_admin,
    };
  });

  const memberUserIds = new Set(memberRows.map((m) => m.userId));
  const eligibleUsers = (allUsers ?? []).filter((u) => !memberUserIds.has(u.id));

  return (
    <div className="px-4 pb-20 pt-5">
      <div className="mb-1 flex items-center gap-2">
        <Link href="/admin/households" className="font-sans text-sm text-text-3 hover:text-text">
          Households
        </Link>
        <span className="text-text-3">/</span>
        <span className="font-sans text-sm text-text">{household.name}</span>
      </div>

      <h1
        className="mb-0.5 font-display font-semibold text-text"
        style={{ fontSize: 26, letterSpacing: "0.01em" }}
      >
        {household.name}
      </h1>
      {household.address && (
        <p className="mb-4 font-sans text-sm text-text-3">{household.address}</p>
      )}

      <HouseholdDetailClient
        householdId={id}
        initialMembers={memberRows}
        eligibleUsers={eligibleUsers}
      />
    </div>
  );
}
