"use client";

import { cn } from "@/components/ui/cn";

type PasswordStrengthProps = {
  level: 0 | 1 | 2 | 3 | 4;
  className?: string;
};

/**
 * 4-bar password strength meter.
 *
 * Bars 0..(level-1) are accent-colored, the rest are dim.
 * Use {@link calculatePasswordStrength} to derive `level` from a password string.
 */
export function PasswordStrength({ level, className }: PasswordStrengthProps) {
  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "h-[3px] w-[14px] rounded-full",
            i < level ? "bg-accent" : "bg-border-strong",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Score a password into 0..4 bars based on length tiers + character-class
 * diversity. Pure function — safe to call from render.
 *
 * Heuristic:
 *   length 0          → 0
 *   length 1..7       → 1
 *   length ≥ 8        → 2 + 1 if ≥3 classes, + 1 more if ≥12 chars + 4 classes
 *
 * Character classes counted: lowercase, uppercase, digit, symbol.
 */
export function calculatePasswordStrength(
  password: string,
): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const len = password.length;
  if (len < 8) return 1;

  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^A-Za-z0-9]/.test(password)) classes += 1;

  // Length 8-11
  if (len < 12) {
    if (classes >= 3) return 3;
    if (classes >= 2) return 2;
    return 2;
  }

  // Length 12-15
  if (len < 16) {
    if (classes >= 3) return 3;
    return 2;
  }

  // Length ≥ 16
  if (classes >= 3) return 4;
  return 3;
}
