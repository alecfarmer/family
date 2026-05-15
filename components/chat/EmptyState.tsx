"use client";

import { FamilyMark } from "@/components/brand/FamilyMark";
import { PromptChip } from "@/components/chat/PromptChip";
import { cn } from "@/components/ui/cn";

const PROMPT_CHIPS = [
  "What's the WiFi password?",
  "How do I reconnect the living room TV?",
  "Show me streaming accounts",
] as const;

export type EmptyStateProps = {
  onSelect: (text: string) => void;
  className?: string;
};

export function EmptyState({ onSelect, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center px-6",
        className,
      )}
    >
      {/* Radial accent glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 220,
          height: 220,
          background:
            "radial-gradient(circle, rgba(200,121,65,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div
        className="relative"
        style={{ filter: "drop-shadow(0 0 24px rgba(200,121,65,0.15))" }}
      >
        <FamilyMark size={56} color="#C87941" />
      </div>

      {/* Headline */}
      <h1 className="mt-5 text-center font-display text-[26px] font-semibold tracking-[0.01em] text-text">
        Everything&apos;s in order.
      </h1>

      {/* Sub-headline */}
      <p className="mt-1.5 max-w-[280px] text-center text-[14px] leading-relaxed text-text-2">
        Ask me about WiFi, streaming, the thermostat — anything around the
        house.
      </p>

      {/* Prompt chips */}
      <div className="mt-10 flex w-full max-w-[320px] flex-col items-stretch gap-2">
        {PROMPT_CHIPS.map((text) => (
          <PromptChip key={text} onClick={() => onSelect(text)}>
            {text}
          </PromptChip>
        ))}
      </div>
    </div>
  );
}
