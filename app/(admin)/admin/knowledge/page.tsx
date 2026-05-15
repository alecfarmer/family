import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { KnowledgeClient } from "./KnowledgeClient";
import type { KnowledgeGroup } from "./KnowledgeClient";

export default async function AdminKnowledgePage() {
  const { sb } = await requireAdmin();

  const [entriesResult, householdsResult] = await Promise.all([
    sb
      .from("knowledge_base")
      .select("*")
      .order("created_at", { ascending: false }),
    sb.from("households").select("id, name").order("name"),
  ]);

  const entries = entriesResult.data ?? [];
  const households = (householdsResult.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
  }));

  // Group entries: null household_id → "Global / All households"
  const globalEntries = entries.filter((e) => e.household_id === null);
  const householdEntries = households.map((h) => ({
    householdId: h.id,
    householdName: h.name,
    entries: entries.filter((e) => e.household_id === h.id),
  }));

  const groups: KnowledgeGroup[] = [
    { householdId: null, householdName: "Global / All households", entries: globalEntries },
    ...householdEntries,
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <a
            href="/admin"
            className="mb-3 inline-block font-sans text-xs text-text-3 hover:text-text-2"
          >
            ← Admin
          </a>
          <h1 className="font-display text-[28px] font-semibold text-text">
            Knowledge Base
          </h1>
          <p className="mt-1 font-sans text-sm text-text-2">
            {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
          </p>
        </div>

        <KnowledgeClient groups={groups} households={households} />
      </div>
    </div>
  );
}
