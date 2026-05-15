import { requireUser } from "@/lib/auth";
import { SearchBar } from "@/components/vault/SearchBar";
import { VaultList, type VaultCredential } from "@/components/vault/VaultList";

export default async function VaultPage() {
  const { profile, sb } = await requireUser();
  const isAdmin = profile.role === "admin";

  // Pull credentials + household memberships in parallel. RLS guarantees
  // the user only sees creds for their household(s) + globally shared rows.
  const [credsRes, membershipsRes] = await Promise.all([
    sb
      .from("credentials")
      .select(
        "id, household_id, category, service_name, username, url, notes, is_shared",
      )
      .order("service_name"),
    sb.from("household_members").select("household_id").eq("user_id", profile.id),
  ]);

  const membershipIds = (membershipsRes.data ?? []).map((m) => m.household_id);

  // For admins we fetch every household so the credential form's select
  // can show all of them. For non-admins we only fetch the user's own
  // memberships — that's also what feeds the per-row household chip and
  // the household filter pill row.
  const householdsRes = isAdmin
    ? await sb.from("households").select("id, name").order("name")
    : membershipIds.length
      ? await sb
          .from("households")
          .select("id, name")
          .in("id", membershipIds)
          .order("name")
      : { data: [] };

  const households = householdsRes.data ?? [];
  const householdNameById = new Map(households.map((h) => [h.id, h.name]));

  const creds: VaultCredential[] = (credsRes.data ?? []).map((c) => ({
    id: c.id,
    service_name: c.service_name,
    username: c.username,
    is_shared: c.is_shared,
    category: c.category,
    household_id: c.household_id,
    household_name: c.household_id
      ? (householdNameById.get(c.household_id) ?? null)
      : null,
    url: c.url,
    notes: c.notes,
  }));

  const total = creds.length;
  const shared = creds.filter((c) => c.is_shared).length;
  const categories = Array.from(new Set(creds.map((c) => c.category))).sort();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 bg-bg px-4 pb-3 pt-6">
        <h1
          className="mb-1.5 font-display font-semibold text-text"
          style={{ fontSize: 34, letterSpacing: "0.01em" }}
        >
          Vault
        </h1>

        <p className="mb-3.5 font-sans text-[13.5px] text-text-2">
          {total} credential{total !== 1 ? "s" : ""} · {shared} shared with you
        </p>

        {/* Search bar (visual only v1) */}
        <SearchBar className="mb-3" />
      </div>

      {/* Filter pills + scrollable list (client) */}
      <VaultList
        credentials={creds}
        categories={categories}
        isAdmin={isAdmin}
        households={households}
      />
    </div>
  );
}
