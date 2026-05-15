"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/cn";

// ── Types ────────────────────────────────────────────────────────────────────

export type LogFilter = "all" | "credentials" | "chat" | "admin" | "logins" | "help";

const FILTERS: { value: LogFilter; label: string; dotClass?: string }[] = [
  { value: "all", label: "All" },
  { value: "credentials", label: "Credentials", dotClass: "bg-accent" },
  { value: "chat", label: "Chat", dotClass: "bg-[#7B9EC8]" },
  { value: "admin", label: "Admin", dotClass: "bg-[#9D7BC8]" },
  { value: "logins", label: "Logins", dotClass: "bg-success" },
  { value: "help", label: "Help", dotClass: "bg-warning" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function LogFilters({ current }: { current: LogFilter }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(filter: LogFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    // Reset limit when changing filter
    params.delete("limit");
    router.push(`?${params.toString()}`);
  }

  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1"
      role="group"
      aria-label="Filter log entries"
    >
      {FILTERS.map((f) => {
        const isActive = f.value === current;
        return (
          <button
            key={f.value}
            onClick={() => navigate(f.value)}
            aria-pressed={isActive}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5",
              "font-sans text-xs font-medium whitespace-nowrap",
              "transition-colors",
              isActive
                ? "bg-accent text-bg"
                : "border border-border bg-surface text-text-2 hover:bg-surface-elevated",
            )}
          >
            {f.dotClass && !isActive && (
              <span
                className={cn("h-1.5 w-1.5 rounded-full", f.dotClass)}
                aria-hidden
              />
            )}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
