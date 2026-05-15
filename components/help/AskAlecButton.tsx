"use client";

import { useState } from "react";
import { AskAlecSheet } from "./AskAlecSheet";

export function AskAlecButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] font-sans text-[15px] font-semibold tracking-[0.02em] text-bg"
        style={{
          background: "var(--color-accent)",
          padding: "14px 16px",
          boxShadow: "0 0 24px rgba(200,121,65,0.35)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 4h14v10H8l-4 3v-3H3V4Z"
            stroke="var(--color-bg)"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        Ask Alec
      </button>

      <AskAlecSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
