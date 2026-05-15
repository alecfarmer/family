import { requireUser } from "@/lib/auth";
import { getActiveHouseholdScope } from "@/lib/activeHousehold";
import { getAllHouseholds, getUserHouseholds } from "@/lib/household";
import { SearchBar } from "@/components/vault/SearchBar";
import { VaultList, type VaultCredential } from "@/components/vault/VaultList";

export default async function VaultPage() {
  const { profile, sb } = await requireUser();
  const isAdmin = profile.role === "admin";

  // All page-level fetches in parallel. cache()-wrapped helpers share the
  // membership query with the layout, so no duplicate DB roundtrip.
  const [credsRes, households, scope] = await Promise.all([
    sb
      .from("credentials")
      .select(
        "id, household_id, category, service_name, username, url, notes, is_shared",
      )
      .order("service_name"),
    isAdmin ? getAllHouseholds() : getUserHouseholds(profile.id),
    getActiveHouseholdScope(),
  ]);
  const householdNameById = new Map(households.map((h) => [h.id, h.name]));

  const allCreds: VaultCredential[] = (credsRes.data ?? []).map((c) => ({
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

  // Apply the global household scope. "All" = no filter. Specific household
  // = that household's creds PLUS globally shared creds (e.g. Netflix), so
  // the family-wide essentials still surface when scoped.
  const creds =
    scope.kind === "all"
      ? allCreds
      : allCreds.filter(
          (c) => c.household_id === scope.id || c.is_shared,
        );

  const total = creds.length;
  const shared = creds.filter((c) => c.is_shared).length;
  const categories = Array.from(new Set(creds.map((c) => c.category))).sort();

  // Show the household chip on rows when:
  // - user is in 2+ households (multi-household view), OR
  // - viewing a specific household scope and the row is shared (visually
  //   distinguishes "this household's WiFi" from "the shared Netflix").
  const multiHousehold = households.length >= 2;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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

        <SearchBar className="mb-3" />
      </div>

      <VaultList
        credentials={creds}
        categories={categories}
        isAdmin={isAdmin}
        households={households}
        scopedHousehold={
          scope.kind === "household" ? { id: scope.id, name: scope.name } : null
        }
        multiHousehold={multiHousehold}
      />
    </div>
  );
}
