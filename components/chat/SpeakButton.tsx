"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export type SpeakButtonProps = {
  text: string;
  className?: string;
};

export function SpeakButton({ text, className }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // speechSynthesis is browser-only; skip server/unsupported environments
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (speaking) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  function handleClick() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Prefer the first en-US voice if available
    const voices = window.speechSynthesis.getVoices();
    const enUS = voices.find((v) => v.lang === "en-US");
    if (enUS) utterance.voice = enUS;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? "Stop reading aloud" : "Read aloud"}
      aria-pressed={speaking}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
        "border border-transparent",
        speaking
          ? "border-accent text-accent"
          : "text-text-3 hover:border-border hover:text-text-2",
        className,
      )}
    >
      {speaking ? (
        // Speaker with wave — active
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3 7.5v5h3.5L12 17V3L6.5 7.5H3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14.5 6.5a4 4 0 0 1 0 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16.5 4a7 7 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Speaker muted / at rest
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3 7.5v5h3.5L12 17V3L6.5 7.5H3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14.5 6.5a4 4 0 0 1 0 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
