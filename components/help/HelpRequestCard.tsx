import { Badge } from "@/components/ui/Badge";
import type { Tables } from "@/lib/supabase/types";

function formatActivityTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);
  const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (date >= todayStart) return `Today · ${timePart}`;
  if (date >= yesterdayStart) return `Yesterday · ${timePart}`;
  if (date >= sevenDaysAgo) return `${date.toLocaleDateString("en-US", { weekday: "short" })} · ${timePart}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${timePart}`;
}

type HelpRequest = Tables<"help_requests">;

type Props = {
  request: HelpRequest;
};

export function HelpRequestCard({ request }: Props) {
  const isOpen = request.status === "open";
  const timestamp = formatActivityTime(request.created_at);

  return (
    <div className="rounded-[14px] border border-border bg-surface p-3.5">
      <div className="mb-1.5 flex items-start justify-between gap-2.5">
        <p className="flex-1 font-sans text-[14px] leading-[1.4] text-text">
          {request.message}
        </p>
        <Badge tone={isOpen ? "warning" : "success"}>
          {isOpen ? "Open" : "Resolved"}
        </Badge>
      </div>

      <p
        className="font-sans text-text-3"
        style={{ fontSize: 11.5, letterSpacing: "0.02em" }}
      >
        {timestamp}
      </p>

      {request.resolved_notes && (
        <div
          className="mt-2.5 rounded-[10px] border border-border bg-bg p-2.5"
          style={{ borderLeftWidth: 2, borderLeftColor: "var(--color-success)" }}
        >
          <p className="font-sans text-[13px] leading-[1.45] text-text-2">
            <span className="font-semibold text-success">Alec · </span>
            {request.resolved_notes}
          </p>
        </div>
      )}
    </div>
  );
}
