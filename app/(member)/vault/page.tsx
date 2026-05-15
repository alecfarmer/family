import { requireUser } from "@/lib/auth";
import { getActiveHouseholdScope } from "@/lib/activeHousehold";
import { getAllHouseholds, getUserHouseholds } from "@/lib/household";
import { canManageBilling, lockUrgency } from "@/lib/billing";
import { SearchBar } from "@/components/vault/SearchBar";
import { VaultList, type VaultCredential } from "@/components/vault/VaultList";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Local type — `credential_admin_notes` is not in lib/supabase/types.ts.
type AdminNotesRow = { credential_id: string; notes: string };

export default async function VaultPage() {
  const { profile, sb } = await requireUser();
  const isAdmin = profile.role === "admin";

  // All in parallel. RLS will block credential_billing rows the viewer can't
  // see, so the join is safe to issue for everyone — admins get the billing
  // data, members get null for the join.
  const [credsRes, billingRes, households, scope, billingAllowed] =
    await Promise.all([
      sb
        .from("credentials")
        .select(
          "id, household_id, category, service_name, username, url, notes, is_shared",
        )
        .order("service_name"),
      sb
        .from("credential_billing")
        .select(
          "credential_id, monthly_cost, price_locked_until, last_negotiated_at, notes",
        ),
      isAdmin ? getAllHouseholds() : getUserHouseholds(profile.id),
      getActiveHouseholdScope(),
      canManageBilling(),
    ]);

  // Admin-only private notes — only worth fetching when the viewer can see
  // them. RLS would return an empty set anyway, but skipping the query keeps
  // the page render lean for regular members.
  const adminNotesRes = billingAllowed
    ? ((await sb
        .from("credential_admin_notes" as never)
        .select("credential_id, notes")) as unknown as {
        data: AdminNotesRow[] | null;
      })
    : { data: null };
  const adminNotesByCredId = new Map<string, string>(
    (adminNotesRes.data ?? []).map((r) => [r.credential_id, r.notes] as const),
  );

  const billingByCredId = new Map(
    (billingRes.data ?? []).map((b) => [b.credential_id, b] as const),
  );
  const householdNameById = new Map(households.map((h) => [h.id, h.name]));

  const allCreds: VaultCredential[] = (credsRes.data ?? []).map((c) => {
    const billing = billingByCredId.get(c.id) ?? null;
    const urgency = billing
      ? lockUrgency(billing.price_locked_until)
      : null;

    return {
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
      // Only ship billing to admins. Members see undefined.
      billing: billingAllowed
        ? billing
          ? {
              monthly_cost: billing.monthly_cost,
              price_locked_until: billing.price_locked_until,
              last_negotiated_at: billing.last_negotiated_at,
              notes: billing.notes,
            }
          : null
        : undefined,
      // Admin-only private notes — undefined for members, "" for admins
      // with no row yet so the form starts blank without a refetch.
      admin_notes: billingAllowed
        ? (adminNotesByCredId.get(c.id) ?? null)
        : undefined,
      // Render the chip only when the viewer can see billing AND the
      // urgency is "expired" or "soon" — anything further out is hidden.
      renegotiationChip:
        billingAllowed && billing && (urgency === "expired" || urgency === "soon")
          ? urgency === "expired"
            ? { urgency: "expired", label: "Renegotiate now" }
            : {
                urgency: "soon",
                label: `Renegotiate by ${fmtDate(billing.price_locked_until!)}`,
              }
          : null,
    };
  });

  const creds =
    scope.kind === "all"
      ? allCreds
      : allCreds.filter((c) => c.household_id === scope.id || c.is_shared);

  const total = creds.length;
  const shared = creds.filter((c) => c.is_shared).length;
  const categories = Array.from(new Set(creds.map((c) => c.category))).sort();
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
        canManageBilling={billingAllowed}
      />
    </div>
  );
}
