import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/Badge";
import {
  HelpRequestRow,
  type HelpRequestData,
} from "@/components/admin/HelpRequestRow";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_STATUSES = ["open", "resolved"] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminHelpRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // requireAdmin for access control — sb from requireAdmin also works,
  // but we need service-role for auth.admin.getUserById
  const { sb } = await requireAdmin();
  const sp = await searchParams;

  const rawFocus = Array.isArray(sp.focus) ? sp.focus[0] : sp.focus;

  // Fetch help requests — open first, then created_at desc
  const { data: rawRequests } = await sb
    .from("help_requests")
    .select("*, users(full_name), households(name)")
    .order("status", { ascending: true }) // "open" < "resolved" alphabetically
    .order("created_at", { ascending: false });

  const requests = rawRequests ?? [];

  // Helper to safely extract joined single-object fields
  function getJoined<T>(val: unknown, key: string): T | null {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return (val as Record<string, unknown>)[key] as T ?? null;
    }
    return null;
  }

  // Collect unique user IDs and batch-fetch emails via service-role
  const userIds = [...new Set(requests.map((r) => r.user_id))];
  const emailMap = new Map<string, string | null>();

  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await supabaseService.auth.admin.getUserById(uid);
      emailMap.set(uid, data.user?.email ?? null);
    }),
  );

  // Shape data for the component
  const rows: HelpRequestData[] = requests.map((r) => ({
    ...r,
    user_full_name: getJoined<string>(r.users, "full_name") ?? "Unknown",
    household_name: getJoined<string>(r.households, "name"),
    requester_email: emailMap.get(r.user_id) ?? null,
  }));

  const openCount = rows.filter((r) => r.status === "open").length;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/admin"
            className="mb-3 inline-block font-sans text-xs text-text-3 hover:text-text-2"
          >
            ← Admin
          </a>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] font-semibold text-text">
              Help Requests
            </h1>
            {openCount > 0 && (
              <Badge tone="warning">{openCount} open</Badge>
            )}
          </div>
          <p className="mt-1 font-sans text-sm text-text-2">
            {rows.length} total request{rows.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* List */}
        {rows.length === 0 ? (
          <div className="py-16 text-center font-sans text-sm text-text-2">
            No help requests yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <HelpRequestRow
                key={r.id}
                request={r}
                expanded={rawFocus === r.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
