import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { StatCard } from "@/components/admin/StatCard";
import { ActivityFeed, type ActivityRow } from "@/components/admin/ActivityFeed";
import { SpendBreakdown } from "@/components/admin/SpendBreakdown";

function greeting(): string {
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;

  // Parallel count queries + billing aggregation
  const [
    { count: householdCount },
    { count: memberCount },
    { count: openRequestCount },
    { count: credentialCount },
    { data: rawLogs },
    { data: billingRows },
  ] = await Promise.all([
    supabaseService.from("households").select("id", { count: "exact", head: true }),
    supabaseService
      .from("users")
      .select("id", { count: "exact", head: true })
      .neq("role", "admin"),
    supabaseService
      .from("help_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabaseService.from("credentials").select("id", { count: "exact", head: true }),
    supabaseService
      .from("access_log")
      .select("id, action, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabaseService
      .from("credential_billing")
      .select("monthly_cost, credentials!inner(category)")
      .not("monthly_cost", "is", null),
  ]);

  // Aggregate billing data server-side
  type BillingRow = {
    monthly_cost: string | number | null;
    credentials: { category: string } | { category: string }[];
  };

  const rows = (billingRows ?? []) as BillingRow[];

  let totalMonthly = 0;
  const categoryMap = new Map<string, { monthly: number; count: number }>();

  for (const row of rows) {
    const monthly = Number(row.monthly_cost ?? 0);
    if (!Number.isFinite(monthly) || monthly <= 0) continue;
    totalMonthly += monthly;

    const credObj = Array.isArray(row.credentials)
      ? row.credentials[0]
      : row.credentials;
    const cat = credObj?.category ?? "other";
    const existing = categoryMap.get(cat);
    if (existing) {
      existing.monthly += monthly;
      existing.count += 1;
    } else {
      categoryMap.set(cat, { monthly, count: 1 });
    }
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, vals]) => ({ category, ...vals }))
    .sort((a, b) => b.monthly - a.monthly);

  const trackedCount = rows.length;
  const untrackedCount = Math.max(0, (credentialCount ?? 0) - trackedCount);

  // Resolve actor names for access_log rows
  const userIds = [
    ...new Set((rawLogs ?? []).map((r) => r.user_id).filter(Boolean)),
  ] as string[];

  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: userRows } = await supabaseService
      .from("users")
      .select("id, full_name")
      .in("id", userIds);
    for (const u of userRows ?? []) {
      nameMap.set(u.id, u.full_name);
    }
  }

  const activityRows: ActivityRow[] = (rawLogs ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    actor: (r.user_id ? nameMap.get(r.user_id) : null) ?? "Unknown",
    created_at: r.created_at,
  }));

  const open = openRequestCount ?? 0;

  const stats = [
    { label: "Households", value: householdCount ?? 0 },
    { label: "Members", value: memberCount ?? 0 },
    {
      label: "Open Requests",
      value: open,
      tone: open > 0 ? ("warning" as const) : ("neutral" as const),
    },
    { label: "Credentials", value: credentialCount ?? 0 },
  ];

  return (
    <div className="px-4 pb-20 pt-5">
      <h1
        className="mb-1 font-display font-semibold text-text"
        style={{ fontSize: 30, letterSpacing: "0.01em" }}
      >
        Good {greeting()}, {firstName}
      </h1>
      <p className="mb-4 font-sans text-[13.5px] text-text-2">
        {open > 0
          ? `${open} request${open === 1 ? "" : "s"} waiting for you.`
          : "Everything looks good."}
      </p>

      {/* Stats grid */}
      <div className="mb-[18px] grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            tone={s.tone}
          />
        ))}
      </div>

      {/* Spend breakdown */}
      <SpendBreakdown
        totalMonthly={totalMonthly}
        byCategory={byCategory}
        trackedCount={trackedCount}
        untrackedCount={untrackedCount}
        className="mb-[18px] md:max-w-[480px]"
      />

      {/* Quick actions */}
      <p
        className="mb-2 font-sans font-semibold uppercase text-text-3"
        style={{ fontSize: 11, letterSpacing: "0.14em" }}
      >
        Quick actions
      </p>
      <div className="mb-[18px] flex flex-wrap gap-2">
        {[
          { label: "+ Add Household", href: "/admin/households?new=1" },
          { label: "+ Add User", href: "/admin/users?new=1" },
          { label: "+ Add Credential", href: "/admin/credentials?new=1" },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-full border border-border bg-surface px-3.5 py-2 font-sans text-[12.5px] font-medium text-text transition-colors hover:border-border-strong"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <p
        className="mb-2 font-sans font-semibold uppercase text-text-3"
        style={{ fontSize: 11, letterSpacing: "0.14em" }}
      >
        Recent activity
      </p>
      <ActivityFeed rows={activityRows} />
    </div>
  );
}
