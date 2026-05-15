import { requireUser } from "@/lib/auth";
import { SearchBar } from "@/components/vault/SearchBar";
import { VaultList } from "@/components/vault/VaultList";

export default async function VaultPage() {
  const { profile, sb } = await requireUser();

  const { data: credentials } = await sb
    .from("credentials")
    .select("id, household_id, category, service_name, username, url, notes, is_shared")
    .order("service_name");

  const creds = credentials ?? [];

  const total = creds.length;
  const shared = creds.filter((c) => c.is_shared).length;

  const categories = Array.from(
    new Set(creds.map((c) => c.category as string)),
  ).sort();

  const firstInitial =
    (profile.full_name ?? "").charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 bg-bg px-4 pb-3 pt-6">
        <div className="mb-1.5 flex items-center justify-between">
          <h1
            className="font-display font-semibold text-text"
            style={{ fontSize: 34, letterSpacing: "0.01em" }}
          >
            Vault
          </h1>
          {/* Avatar — complements AppHeader avatar per design */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full font-sans text-[13px] font-semibold text-bg"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), #8a4f29)",
            }}
          >
            {firstInitial}
          </div>
        </div>

        <p className="mb-3.5 font-sans text-[13.5px] text-text-2">
          {total} credential{total !== 1 ? "s" : ""} · {shared} shared with you
        </p>

        {/* Search bar (visual only v1) */}
        <SearchBar className="mb-3" />
      </div>

      {/* Category pills + scrollable list (client) */}
      <VaultList credentials={creds} categories={categories} />
    </div>
  );
}
