import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { HouseholdsClient } from "./HouseholdsClient";

export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const openNew = sp.new === "1";

  const { data: households } = await supabaseService
    .from("households")
    .select("id, name, address, created_at")
    .order("name");

  // Member counts per household
  const { data: memberCounts } = await supabaseService
    .from("household_members")
    .select("household_id");

  const countMap = new Map<string, number>();
  for (const r of memberCounts ?? []) {
    countMap.set(r.household_id, (countMap.get(r.household_id) ?? 0) + 1);
  }

  const rows = (households ?? []).map((h) => ({
    ...h,
    memberCount: countMap.get(h.id) ?? 0,
  }));

  return <HouseholdsClient initial={rows} openNew={openNew} />;
}
