import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase/service";
import { ActivityList } from "@/components/notifications/ActivityList";
import { MarkAllReadButton } from "@/components/notifications/ActivityMarkAllRead";
import { canManageBilling, daysUntilLockExpires } from "@/lib/billing";

function formatActivityRowTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 6) return `${diffHrs}h`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= todayStart) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  if (date >= yesterdayStart) return "Yesterday";
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);
  if (date >= sevenDaysAgo) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
import type { ActivityItem, ActivityKind, ActivityTone } from "@/components/notifications/ActivityRow";

function makeId(prefix: string, id: string) {
  return `${prefix}:${id}`;
}

function truncate(s: string, max = 120): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}

export default async function ActivityPage() {
  const { user, profile, sb } = await requireUser();

  // Snapshot last_seen_activity BEFORE we update it — used for unread detection
  const lastSeen = profile.last_seen_activity
    ? new Date(profile.last_seen_activity)
    : new Date(0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const sixtyDaysOut = new Date(Date.now() + 60 * 86_400_000).toISOString();
  // Renegotiation window: already-overdue up to 14d back, expiring next 30d
  const fourteenDaysAgoYMD = new Date(Date.now() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const thirtyDaysOutYMD = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const billingAllowed = await canManageBilling();

  // `announcements` isn't yet in `lib/supabase/types.ts` (hand-written) and
  // the task spec forbids editing that file. Inline the row shape we need
  // from the join just below.
  type AnnouncementActivityRow = {
    id: string;
    title: string;
    body: string;
    created_at: string;
  };

  // 7 parallel queries — RLS scopes each to the authenticated user's data.
  // The billing query is admin-gated; non-admins get an empty resolved value.
  const [
    helpRes,
    credRes,
    deviceRes,
    loginRes,
    householdRes,
    billingRes,
    announcementRes,
  ] = await Promise.all([
    // 1. Resolved help requests (reply activity)
    sb
      .from("help_requests")
      .select("id, message, resolved_notes, resolved_at, created_at")
      .eq("user_id", user.id)
      .eq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(20),

    // 2. Recently added credentials accessible to the user's households
    sb
      .from("credentials")
      .select("id, service_name, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20),

    // 3. Devices with warranty expiring in the next 60 days
    sb
      .from("devices")
      .select("id, name, warranty_expiry")
      .not("warranty_expiry", "is", null)
      .gte("warranty_expiry", new Date().toISOString())
      .lte("warranty_expiry", sixtyDaysOut)
      .order("warranty_expiry", { ascending: true })
      .limit(10),

    // 4. Login events from the last 30 days
    sb
      .from("access_log")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("action", "logged_in")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10),

    // 5. Household membership records added in last 7 days
    sb
      .from("household_members")
      .select("id, created_at, households(name)")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(5),

    // 6. Billing renegotiation reminders. RLS keeps non-admin members
    //    locked out of credential_billing entirely; even if we skipped the
    //    JS gate, they'd get an empty result. We still skip when we know
    //    they can't see anything to save the roundtrip.
    billingAllowed
      ? sb
          .from("credential_billing")
          .select(
            "credential_id, price_locked_until, credentials!inner(service_name)",
          )
          .not("price_locked_until", "is", null)
          .gte("price_locked_until", fourteenDaysAgoYMD)
          .lte("price_locked_until", thirtyDaysOutYMD)
          .order("price_locked_until", { ascending: true })
          .limit(10)
      : Promise.resolve({ data: [] }),

    // 7. Announcements visible to the user. RLS already filters by
    //    (global OR member-of-household); we add the time/expiry filters
    //    here so the activity feed only surfaces fresh, unexpired posts.
    //    Cast the client because `announcements` isn't in the hand-written
    //    Database type yet (lib/supabase/types.ts is off-limits per spec).
    (sb as unknown as SupabaseClient)
      .from("announcements")
      .select("id, title, body, created_at")
      .gte("created_at", thirtyDaysAgo)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Update last_seen_activity via service role to bypass RLS
  try {
    await supabaseService
      .from("users")
      .update({ last_seen_activity: new Date().toISOString() })
      .eq("id", user.id);
  } catch {
    // Non-fatal — don't crash the render
  }

  // Build raw items with createdAt timestamps preserved
  type RawItem = ActivityItem & { createdAt: Date };

  const rawItems: RawItem[] = [];

  for (const r of helpRes.data ?? []) {
    if (!r.resolved_notes) continue;
    const createdAt = new Date(r.resolved_at ?? r.created_at);
    rawItems.push({
      id: makeId("reply", r.id),
      kind: "reply" as ActivityKind,
      tone: "accent" as ActivityTone,
      title: "Alec replied",
      body: truncate(r.resolved_notes, 120),
      meta: "Help",
      time: formatActivityRowTime(createdAt),
      unread: createdAt > lastSeen,
      createdAt,
    });
  }

  for (const c of credRes.data ?? []) {
    const createdAt = new Date(c.created_at);
    rawItems.push({
      id: makeId("share", c.id),
      kind: "share" as ActivityKind,
      tone: "success" as ActivityTone,
      title: "New credential shared",
      body: `${c.service_name} was added to your vault.`,
      meta: "Vault",
      time: formatActivityRowTime(createdAt),
      unread: createdAt > lastSeen,
      createdAt,
    });
  }

  for (const d of deviceRes.data ?? []) {
    if (!d.warranty_expiry) continue;
    const expiry = new Date(d.warranty_expiry);
    const daysLeft = Math.ceil(
      (expiry.getTime() - Date.now()) / 86_400_000,
    );
    const createdAt = expiry; // treat expiry proximity as the "event time"
    rawItems.push({
      id: makeId("warning", d.id),
      kind: "warning" as ActivityKind,
      tone: "warning" as ActivityTone,
      title: "Warranty expiring soon",
      body: `${d.name} — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining.`,
      meta: "Devices",
      time: `${daysLeft}d`,
      unread: false, // warranty alerts don't drive the unread dot
      createdAt: new Date(), // show in Today group
    });
  }

  for (const l of loginRes.data ?? []) {
    const createdAt = new Date(l.created_at);
    rawItems.push({
      id: makeId("login", l.id),
      kind: "login" as ActivityKind,
      tone: "success" as ActivityTone,
      title: "Signed in",
      body: "Signed in on a new device.",
      meta: "Security",
      time: formatActivityRowTime(createdAt),
      unread: createdAt > lastSeen,
      createdAt,
    });
  }

  for (const hm of householdRes.data ?? []) {
    const createdAt = new Date(hm.created_at);
    const household = hm.households as { name: string } | null;
    const householdName = household?.name ?? "your household";
    rawItems.push({
      id: makeId("household", hm.id),
      kind: "household" as ActivityKind,
      tone: "admin" as ActivityTone,
      title: `Welcome to ${householdName}`,
      body: "You were added as a member. Take a look around.",
      meta: "Household",
      time: formatActivityRowTime(createdAt),
      unread: createdAt > lastSeen,
      createdAt,
    });
  }

  // Announcements — admin-posted notes to the family. `kind='household'`
  // reuses the FamilyMark icon since there's no dedicated announcement
  // glyph yet; tone='admin' gives it the purple tile that visually
  // separates it from the orange/green/amber rows.
  const announcementRows =
    (announcementRes.data as AnnouncementActivityRow[] | null) ?? [];
  for (const a of announcementRows) {
    const createdAt = new Date(a.created_at);
    rawItems.push({
      id: makeId("announcement", a.id),
      kind: "household" as ActivityKind,
      tone: "admin" as ActivityTone,
      title: a.title,
      body: truncate(a.body, 120),
      meta: "Announcement",
      time: formatActivityRowTime(createdAt),
      unread: createdAt > lastSeen,
      createdAt,
    });
  }

  // Billing renegotiation reminders — admin-only. Renders as a warning row
  // with the service name and a "call by …" / "X days overdue" subtitle.
  type BillingRow = {
    credential_id: string;
    price_locked_until: string;
    credentials:
      | { service_name: string }
      | { service_name: string }[]
      | null;
  };
  for (const r of (billingRes.data as BillingRow[] | null) ?? []) {
    const cred = Array.isArray(r.credentials)
      ? r.credentials[0]
      : r.credentials;
    if (!cred) continue;
    const daysLeft = daysUntilLockExpires(r.price_locked_until);
    if (daysLeft === null) continue;
    const body =
      daysLeft < 0
        ? `${cred.service_name} locked price ended ${-daysLeft} day${
            daysLeft === -1 ? "" : "s"
          } ago. Time to call.`
        : daysLeft === 0
          ? `${cred.service_name} locked price ends today. Call to renegotiate.`
          : `${cred.service_name} locked price ends in ${daysLeft} day${
              daysLeft === 1 ? "" : "s"
            }. Renegotiate now to avoid the bump.`;
    rawItems.push({
      id: makeId("billing", r.credential_id),
      kind: "warning" as ActivityKind,
      tone: "warning" as ActivityTone,
      title: "Time to renegotiate",
      body,
      meta: "Billing",
      time: daysLeft < 0 ? "overdue" : `${daysLeft}d`,
      unread: false, // billing reminders are persistent, not unread-driven
      createdAt: new Date(),
    });
  }

  // Sort all items newest-first
  rawItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Group into Today / Yesterday / Earlier using createdAt
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const todayItems: ActivityItem[] = [];
  const yesterdayItems: ActivityItem[] = [];
  const earlierItems: ActivityItem[] = [];

  for (const item of rawItems) {
    const { createdAt, ...rest } = item;
    if (createdAt >= todayStart) todayItems.push(rest);
    else if (createdAt >= yesterdayStart) yesterdayItems.push(rest);
    else earlierItems.push(rest);
  }

  const groups = [
    { label: "Today", items: todayItems },
    { label: "Yesterday", items: yesterdayItems },
    { label: "Earlier", items: earlierItems },
  ];

  const unreadCount = rawItems.filter((i) => i.unread).length;
  const totalCount = rawItems.length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-bg px-4 pb-3.5 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center text-text-2 active:text-text"
              aria-label="Back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 5L8 12l7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <h1
              className="font-display font-semibold text-text"
              style={{ fontSize: 28, letterSpacing: "0.01em" }}
            >
              Activity
            </h1>
          </div>

          <MarkAllReadButton unreadCount={unreadCount} />
        </div>

        <p className="mt-0.5 font-sans text-[13px] text-text-2">
          {unreadCount} new · {totalCount} total
        </p>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-auto px-4 pb-8 pt-3">
        <ActivityList groups={groups} />
      </div>
    </div>
  );
}
