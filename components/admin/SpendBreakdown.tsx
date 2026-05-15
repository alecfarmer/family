import Link from "next/link";
import { cn } from "@/components/ui/cn";

type SpendCategory = {
  category: string;
  monthly: number;
  count: number;
};

export type SpendBreakdownProps = {
  totalMonthly: number;
  byCategory: SpendCategory[];
  trackedCount: number;
  untrackedCount: number;
  className?: string;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function SpendBreakdown({
  totalMonthly,
  byCategory,
  trackedCount,
  untrackedCount,
  className,
}: SpendBreakdownProps) {
  // Empty state
  if (totalMonthly === 0) {
    return (
      <div
        className={cn(
          "rounded-[14px] border border-border bg-surface p-[14px]",
          className,
        )}
      >
        <div
          className="mb-2 font-sans font-semibold uppercase text-text-3"
          style={{ fontSize: 10.5, letterSpacing: "0.14em" }}
        >
          Monthly Tech Spend
        </div>
        <div
          className="mb-1 font-display font-semibold text-text-2 leading-none"
          style={{ fontSize: 24, letterSpacing: "-0.01em" }}
        >
          Nothing tracked yet
        </div>
        <Link
          href="/admin/credentials"
          className="font-sans text-accent hover:text-accent-light transition-colors"
          style={{ fontSize: 13 }}
        >
          Start tracking →
        </Link>
      </div>
    );
  }

  const visibleCategories = byCategory.filter((c) => c.monthly > 0);

  return (
    <div
      className={cn(
        "rounded-[14px] border border-border bg-surface p-[14px]",
        className,
      )}
    >
      {/* Header label */}
      <div
        className="mb-2 font-sans font-semibold uppercase text-text-3"
        style={{ fontSize: 10.5, letterSpacing: "0.14em" }}
      >
        Monthly Tech Spend
      </div>

      {/* Primary total — mirrors StatCard's 36px display number */}
      <div
        className="font-display font-semibold leading-none text-text"
        style={{ fontSize: 36, letterSpacing: "-0.01em" }}
      >
        {usd.format(totalMonthly)}
      </div>

      {/* Annual estimate */}
      <div
        className="mt-1 mb-4 text-text-2"
        style={{ fontSize: 13 }}
      >
        ≈ {usd.format(totalMonthly * 12)} / yr
      </div>

      {/* Category breakdown */}
      {visibleCategories.length > 0 && (
        <div className="mb-4 flex flex-col gap-[7px]">
          {visibleCategories.map((c) => (
            <div key={c.category} className="flex items-baseline gap-1.5">
              {/* Label + count */}
              <span
                className="shrink-0 font-sans text-text"
                style={{ fontSize: 13 }}
              >
                {capitalize(c.category)}
              </span>
              <span
                className="shrink-0 font-sans text-text-3"
                style={{ fontSize: 11.5 }}
              >
                ({c.count})
              </span>
              {/* Dotted leader */}
              <span
                className="flex-1 border-b border-dotted border-border-strong"
                aria-hidden
              />
              {/* Cost */}
              <span
                className="shrink-0 font-mono text-text"
                style={{ fontSize: 13 }}
              >
                {usd.format(c.monthly)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex flex-wrap items-center gap-x-1.5 text-text-3"
        style={{ fontSize: 12 }}
      >
        <span>
          {trackedCount} tracked · {untrackedCount} untracked
        </span>
        {untrackedCount > 0 && (
          <>
            <span aria-hidden>·</span>
            <Link
              href="/admin/credentials"
              className="text-text-2 hover:text-text transition-colors"
            >
              Track billing →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
