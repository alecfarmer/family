import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type BadgeTone = "success" | "warning" | "danger" | "accent" | "neutral";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-success/15 text-success border-success/35",
  warning: "bg-warning/15 text-warning border-warning/40",
  danger: "bg-destructive/15 text-[#C77575] border-destructive/40",
  accent: "bg-accent/10 text-accent border-accent/35",
  neutral: "bg-surface-elevated text-text-2 border-border",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] font-sans font-semibold uppercase",
        TONE_STYLES[tone],
        className,
      )}
      style={{ fontSize: 10.5, letterSpacing: "0.06em" }}
    >
      {children}
    </span>
  );
}
