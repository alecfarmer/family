import { requireUser } from "@/lib/auth";
import { SearchBar } from "@/components/vault/SearchBar";
import { VaultList, type VaultCredential } from "@/components/vault/VaultList";

export default async function VaultPage() {
  const { profile, sb } = await requireUser();
  const isAdmin = profile.role === "admin";

  const credsRes = await sb
    .from("credentials")
    .select(
      "id, household_id, category, service_name, username, url, notes, is_shared",
    )
    .order("service_name");

  const creds: VaultCredential[] = (credsRes.data ?? []).map((c) => ({
    id: c.id,
    service_name: c.service_name,
    username: c.username,
    is_shared: c.is_shared,
    category: c.category,
    household_id: c.household_id,
    url: c.url,
    notes: c.notes,
  }));

  // Only admins ever see the household select inside the credential form.
  // For everyone else we skip the query entirely.
  const households = isAdmin
    ? ((await sb.from("households").select("id, name").order("name")).data ?? [])
    : [];

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

      {/* Category pills + scrollable list (client) */}
      <VaultList
        credentials={creds}
        categories={categories}
        isAdmin={isAdmin}
        households={households}
      />
    </div>
  );
}
