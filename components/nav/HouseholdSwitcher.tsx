"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type SwitcherHousehold = { id: string; name: string };

type Props = {
  /** The full list of households the signed-in user belongs to. */
  households: SwitcherHousehold[];
  /** The current active scope. Renders the trigger label. */
  current:
    | { kind: "all" }
    | { kind: "household"; id: string; name: string };
};

/**
 * Global household switcher rendered in AppHeader.
 *
 * Visible only when the user belongs to ≥2 households — single-household
 * users see no extra chrome since the filter would always have one answer.
 *
 * Tap the trigger pill → bottom sheet with "All Households" + one row per
 * household. Picking a row writes the cookie via /api/active-household and
 * calls router.refresh() so every server component (vault, devices, chat
 * context) re-renders with the new scope.
 */
export function HouseholdSwitcher({ households, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (households.length < 2) return null;

  const currentLabel =
    current.kind === "all" ? "All Households" : current.name;

  function select(value: "all" | string) {
    startTransition(async () => {
      try {
        await fetch("/api/active-household", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });
      } finally {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Switch household — currently ${currentLabel}`}
        className="flex max-w-[140px] items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-2 hover:text-text"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2 5l4-3 4 3v5H2V5z"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="truncate">{currentLabel}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Switch household"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => !isPending && setOpen(false)}
            className="absolute inset-0 cursor-default"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[24px] border-t border-border bg-surface-elevated md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:w-[420px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px]"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-9 rounded-full bg-border-strong" />
            </div>
            <div className="px-5 pb-3 pt-2">
              <h2 className="text-center font-display text-[20px] font-semibold text-text">
                Switch household
              </h2>
              <p className="mt-1 text-center font-sans text-[12px] text-text-2">
                Filters Vault, Devices, and Chat to the selected household.
              </p>
            </div>

            <div className="flex flex-col gap-1 px-3 pt-1">
              <SwitcherOption
                label="All Households"
                hint="Everything you can see, across every household."
                active={current.kind === "all"}
                disabled={isPending}
                onClick={() => select("all")}
              />
              <div className="my-2 border-t border-border" />
              {households.map((h) => (
                <SwitcherOption
                  key={h.id}
                  label={h.name}
                  hint="This household + shared family items."
                  active={current.kind === "household" && current.id === h.id}
                  disabled={isPending}
                  onClick={() => select(h.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SwitcherOption({
  label,
  hint,
  active,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex items-center justify-between rounded-lg px-4 py-3 text-left transition-colors disabled:opacity-50 " +
        (active ? "bg-accent/10" : "hover:bg-bg")
      }
    >
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[14px] font-medium text-text">
          {label}
        </div>
        <div className="mt-0.5 font-sans text-[11.5px] text-text-3">{hint}</div>
      </div>
      {active && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="ml-3 shrink-0"
        >
          <path
            d="M3 8.5l3 3 7-7"
            stroke="var(--color-accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
