"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AskAlecSheet({ open, onClose }: Props) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus textarea when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setMessage("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  async function handleSubmit() {
    if (message.length < 5 || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/help-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const charCount = message.length;
  const valid = charCount >= 5 && charCount <= 2000;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask Alec"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] border-t border-border bg-surface-elevated pb-10"
        style={{ boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-2.5">
          <div className="h-1 w-[38px] rounded-full bg-border-strong" />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-3">
          <button
            onClick={onClose}
            className="font-sans text-[14px] text-text-2 active:text-text"
            aria-label="Cancel"
          >
            Cancel
          </button>
          <h2
            className="font-display font-semibold text-text"
            style={{ fontSize: 20, letterSpacing: "0.01em" }}
          >
            Ask Alec
          </h2>
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="font-sans text-[14px] font-semibold text-accent disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </div>

        <div className="px-5 pt-4">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you need help with?"
            rows={5}
            maxLength={2000}
            className="w-full resize-none rounded-[12px] border border-border bg-bg px-[14px] py-[12px] font-sans text-[15px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-0"
            style={{ lineHeight: 1.5 }}
          />

          <div className="mt-1.5 flex items-center justify-between">
            {error ? (
              <p className="font-sans text-[12px] text-[#C77575]">{error}</p>
            ) : (
              <span />
            )}
            <span
              className="font-sans text-[11.5px]"
              style={{ color: charCount > 1800 ? "var(--color-warning)" : "var(--color-text-3)" }}
            >
              {charCount}/2000
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
