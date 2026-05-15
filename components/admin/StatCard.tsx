import { cn } from "@/components/ui/cn";

export type StatCardTone = "warning" | "neutral";

export type StatCardProps = {
  label: string;
  value: string | number;
  tone?: StatCardTone;
  className?: string;
};

export function StatCard({ label, value, tone = "neutral", className }: StatCardProps) {
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
        {label}
      </div>
      <div
        className={cn(
          "font-display font-semibold leading-none",
          tone === "warning" ? "text-warning" : "text-text",
        )}
        style={{ fontSize: 36, letterSpacing: "-0.01em" }}
      >
        {value}
      </div>
    </div>
  );
}
