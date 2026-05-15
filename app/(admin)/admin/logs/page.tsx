import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LogFilters, type LogFilter } from "@/components/admin/LogFilters";
import { cn } from "@/components/ui/cn";

// ── Tone config ───────────────────────────────────────────────────────────────

const TONE_DOT: Record<string, string> = {
  accent: "bg-accent",
  "tone-chat": "bg-[#7B9EC8]",
  admin: "bg-[#9D7BC8]",
  success: "bg-success",
  warning: "bg-warning",
};

const TONE_TEXT: Record<string, string> = {
  accent: "text-accent",
  "tone-chat": "text-[#7B9EC8]",
  admin: "text-[#9D7BC8]",
  success: "text-success",
  warning: "text-warning",
};

function actionToTone(action: string): string {
  if (action === "viewed_credential") return "accent";
  if (action.startsWith("admin_")) return "admin";
  if (action === "chat_message") return "tone-chat";
  if (action === "logged_in") return "success";
  if (action.startsWith("help")) return "warning";
  return "admin";
}

function actionLabel(action: string): string {
  return action
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/^ADMIN /, "");
}

// ── Filter → SQL predicate ─────────────────────────────────────────────────────

const VALID_FILTERS: LogFilter[] = [
  "all",
  "credentials",
  "chat",
  "admin",
  "logins",
  "help",
];

function isValidFilter(v: unknown): v is LogFilter {
  return typeof v === "string" && (VALID_FILTERS as string[]).includes(v);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sb } = await requireAdmin();
  const sp = await searchParams;

  const rawFilter = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  const activeFilter: LogFilter = isValidFilter(rawFilter) ? rawFilter : "all";

  const rawLimit = Array.isArray(sp.limit) ? sp.limit[0] : sp.limit;
  const limit = Math.min(Math.max(parseInt(rawLimit ?? "200", 10) || 200, 200), 1000);

  // Build query with filter pushed to DB
  let query = sb
    .from("access_log")
    .select("*, users(full_name), households(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (activeFilter === "credentials") {
    query = query.eq("action", "viewed_credential");
  } else if (activeFilter === "chat") {
    query = query.eq("action", "chat_message");
  } else if (activeFilter === "admin") {
    query = query.like("action", "admin_%");
  } else if (activeFilter === "logins") {
    query = query.eq("action", "logged_in");
  } else if (activeFilter === "help") {
    query = query.like("action", "help%");
  }

  const { data: rows } = await query;
  const logRows = rows ?? [];

  // Helper to safely extract joined fields
  function getJoined<T>(
    val: unknown,
    key: string,
  ): T | null {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return (val as Record<string, unknown>)[key] as T ?? null;
    }
    return null;
  }

  const nextLimit = limit + 200;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-5">
          <a
            href="/admin"
            className="mb-3 inline-block font-sans text-xs text-text-3 hover:text-text-2"
          >
            ← Admin
          </a>
          <h1 className="font-display text-[28px] font-semibold text-text">
            Access Log
          </h1>
          <p className="mt-1 font-sans text-sm text-text-2">
            {logRows.length} event{logRows.length !== 1 ? "s" : ""}
            {activeFilter !== "all" ? ` · filtered by ${activeFilter}` : ""}
          </p>
        </div>

        {/* Filter pills — needs Suspense as it uses useSearchParams internally */}
        <div className="mb-4">
          <Suspense>
            <LogFilters current={activeFilter} />
          </Suspense>
        </div>

        {/* Log rows */}
        {logRows.length === 0 ? (
          <div className="py-16 text-center font-sans text-sm text-text-2">
            No log entries match this filter.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {logRows.map((row) => {
              const tone = actionToTone(row.action);
              const userName =
                getJoined<string>(row.users, "full_name") ?? "Unknown";
              const houseName =
                getJoined<string>(row.households, "name") ?? "";
              const time = new Date(row.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              });

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-[11px]"
                >
                  {/* Timestamp column — fixed 64px mono */}
                  <div
                    className="w-16 shrink-0 font-mono text-[11px] text-text-3"
                    aria-label={`Time: ${time}`}
                  >
                    {time}
                  </div>

                  {/* Tone dot */}
                  <div
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      TONE_DOT[tone] ?? "bg-text-3",
                    )}
                    aria-hidden
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-[12.5px] font-medium leading-[1.3] text-text">
                      {userName}
                      {houseName && (
                        <span className="font-normal text-text-3">
                          {" "}
                          · {houseName}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em]",
                        TONE_TEXT[tone] ?? "text-text-2",
                      )}
                    >
                      {actionLabel(row.action)}
                      {row.resource_id && (
                        <span className="text-text-2">
                          {" "}
                          · {row.resource_type ?? row.resource_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {logRows.length >= limit && (
          <div className="mt-6 flex justify-center">
            <a
              href={`?filter=${activeFilter}&limit=${nextLimit}`}
              className="rounded-lg border border-border bg-surface px-6 py-2.5 font-sans text-sm text-text-2 hover:bg-surface-elevated"
            >
              Load more
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
