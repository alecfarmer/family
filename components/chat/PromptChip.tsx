"use client";

import { cn } from "@/components/ui/cn";

export type PromptChipProps = {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export function PromptChip({ children, onClick, className }: PromptChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border border-border bg-surface",
        "px-4 py-2.5 text-left text-[13.5px] font-medium text-text",
        "transition-colors hover:bg-surface-elevated",
        className,
      )}
    >
      {children}
    </button>
  );
}
