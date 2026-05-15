import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { UsersClient } from "./UsersClient";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const openNew = sp.new === "1";

  const [
    { data: users },
    { data: memberships },
    { data: households },
  ] = await Promise.all([
    supabaseService
      .from("users")
      .select("id, full_name, role, created_at")
      .order("full_name"),
    supabaseService.from("household_members").select("user_id, household_id"),
    supabaseService
      .from("households")
      .select("id, name")
      .order("name"),
  ]);

  // Join household_ids per user
  const membershipMap = new Map<string, string[]>();
  for (const m of memberships ?? []) {
    const existing = membershipMap.get(m.user_id) ?? [];
    existing.push(m.household_id);
    membershipMap.set(m.user_id, existing);
  }

  // Build household name map for the column
  const householdNameMap = new Map<string, string>();
  for (const h of households ?? []) {
    householdNameMap.set(h.id, h.name);
  }

  const rows = (users ?? []).map((u) => {
    const hhIds = membershipMap.get(u.id) ?? [];
    return {
      ...u,
      household_ids: hhIds,
      household_names: hhIds.map((id) => householdNameMap.get(id) ?? id),
    };
  });

  return (
    <UsersClient
      initial={rows}
      households={households ?? []}
      openNew={openNew}
    />
  );
}
