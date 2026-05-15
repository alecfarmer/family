"use client";

import { cn } from "@/components/ui/cn";

type ToggleProps = {
  on: boolean;
  onChange?: (next: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

export function Toggle({ on, onChange, ariaLabel, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={cn(
        "relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors",
        on ? "bg-accent" : "bg-border-strong",
        disabled && "opacity-50",
      )}
    >
      <span
        className="absolute top-[2px] block h-[22px] w-[22px] rounded-full bg-text transition-[left] duration-200"
        style={{ left: on ? 20 : 2 }}
      />
    </button>
  );
}
