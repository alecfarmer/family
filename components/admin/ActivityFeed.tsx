// Server component — receives pre-fetched rows from the dashboard page.

export type ActivityRow = {
  id: string;
  action: string;
  actor: string;
  created_at: string;
};

type ToneKey = "accent" | "warning" | "admin" | "chat" | "success" | "neutral";

// Map access_log.action → { tone color CSS var, human label }
const ACTION_MAP: Record<string, { color: string; label: (action: string) => string }> = {
  viewed_credential: {
    color: "var(--color-accent)",
    label: () => "viewed a credential",
  },
  chat_message: {
    color: "var(--color-tone-chat)",
    label: () => "chatted with assistant",
  },
  logged_in: {
    color: "var(--color-success)",
    label: () => "signed in",
  },
  added_credential: {
    color: "var(--color-tone-admin)",
    label: () => "added a credential",
  },
  rotated_credential: {
    color: "var(--color-tone-admin)",
    label: () => "rotated a credential",
  },
  added_device: {
    color: "var(--color-tone-admin)",
    label: () => "added a device",
  },
  added_household: {
    color: "var(--color-tone-admin)",
    label: () => "added a household",
  },
  added_user: {
    color: "var(--color-tone-admin)",
    label: () => "invited a user",
  },
  help_requested: {
    color: "var(--color-warning)",
    label: () => "opened a help request",
  },
  help_resolved: {
    color: "var(--color-success)",
    label: () => "resolved a help request",
  },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const hm = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (d.toDateString() === todayStr) return hm;
  if (d.toDateString() === yesterday.toDateString()) return `${hm} yest`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-sm text-text-3">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
      {rows.map((row, i) => {
        const mapping = ACTION_MAP[row.action];
        const dotColor = mapping?.color ?? "var(--color-text-3)";
        const label = mapping?.label(row.action) ?? row.action.replace(/_/g, " ");

        return (
          <div
            key={row.id}
            className="flex items-center gap-2.5 px-3.5 py-[11px]"
            style={{
              borderBottom:
                i < rows.length - 1 ? "1px solid var(--color-border)" : "none",
            }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: dotColor }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="truncate font-sans text-[13px] leading-[1.35]"
                style={{ color: "var(--color-text)" }}
              >
                <span className="font-semibold">{row.actor}</span>{" "}
                <span style={{ color: "var(--color-text-2)" }}>{label}</span>
              </p>
            </div>
            <time
              className="shrink-0 font-sans text-[11px] text-text-3"
            >
              {formatTime(row.created_at)}
            </time>
          </div>
        );
      })}
    </div>
  );
}
