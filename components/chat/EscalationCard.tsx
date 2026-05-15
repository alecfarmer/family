import { cn } from "@/components/ui/cn";

export type EscalationCardProps = {
  adminName?: string;
  className?: string;
};

export function EscalationCard({
  adminName = "Alec",
  className,
}: EscalationCardProps) {
  return (
    <div
      className={cn("mb-4 max-w-[92%] rounded-[14px] p-3.5", className)}
      style={{
        background: "rgba(200,121,65,0.06)",
        border: "1px solid rgba(200,121,65,0.33)",
        boxShadow: "0 0 24px rgba(200,121,65,0.15)",
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
          style={{ boxShadow: "0 0 8px #C87941" }}
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          Needs a Human
        </span>
      </div>

      {/* Body — interpolate via template literal so JSX whitespace can't drop the spaces around {adminName}. */}
      <p className="mb-3 text-[14px] leading-[1.45] text-text">
        {`I've sent this to ${adminName} along with our conversation so he has the full context. He'll reach out to you directly.`}
      </p>

      {/* Footer — confirmed state */}
      <div className="flex items-center gap-1.5">
        {/* check icon */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 6.5L5.5 9.5L10.5 4"
            stroke="#C87941"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] text-accent opacity-60">
          {`${adminName} has been notified`}
        </span>
      </div>
    </div>
  );
}
