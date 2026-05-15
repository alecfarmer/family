import { requireAdmin } from "@/lib/auth";
import type { AdminCredentialRowData } from "@/components/admin/CredentialRow";
import type {
  CredentialCategory,
  HouseholdOption,
} from "@/components/admin/CredentialForm";
import { CredentialsListClient } from "./CredentialsListClient";

export const dynamic = "force-dynamic";

// Local type — `credential_admin_notes` is not in lib/supabase/types.ts.
type AdminNotesRow = { credential_id: string; notes: string };

export default async function AdminCredentialsPage() {
  const { sb } = await requireAdmin();

  // App admins can read every admin_notes row by RLS. Fetched in parallel so
  // the form can be pre-populated without a second roundtrip when editing.
  const [credsRes, housesRes, adminNotesRes] = await Promise.all([
    sb
      .from("credentials")
      .select(
        "id, service_name, category, household_id, username, url, notes, is_shared, updated_at",
      )
      .order("service_name", { ascending: true }),
    sb.from("households").select("id, name").order("name", { ascending: true }),
    sb
      .from("credential_admin_notes" as never)
      .select("credential_id, notes") as unknown as Promise<{
      data: AdminNotesRow[] | null;
    }>,
  ]);

  const credentials: AdminCredentialRowData[] = (credsRes.data ?? []).map(
    (c) => ({
      id: c.id,
      service_name: c.service_name,
      category: c.category as CredentialCategory,
      household_id: c.household_id,
      username: c.username,
      url: c.url,
      notes: c.notes,
      is_shared: c.is_shared,
      updated_at: c.updated_at,
    }),
  );
  const households: HouseholdOption[] = (housesRes.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
  }));
  const adminNotesByCredId: Record<string, string> = Object.fromEntries(
    (adminNotesRes.data ?? []).map((r) => [r.credential_id, r.notes]),
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-1">
        <h1
          className="m-0 font-display font-semibold text-text"
          style={{ fontSize: 28, letterSpacing: "0.01em" }}
        >
          Credentials
        </h1>
        <p className="mt-1 font-sans text-[13px] text-text-2">
          Manage shared passwords across every household.
        </p>
      </div>
      <CredentialsListClient
        credentials={credentials}
        households={households}
        adminNotesByCredId={adminNotesByCredId}
      />
    </div>
  );
}
