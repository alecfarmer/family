"use client";

import { cn } from "@/components/ui/cn";

export type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Ask Family…",
  disabled = false,
  className,
}: ChatInputProps) {
  const hasValue = value.trim().length > 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !disabled) {
      onSend();
    }
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 border-t border-border px-3.5 pb-7 pt-2.5",
        className,
      )}
      style={{
        background: "rgba(15,13,11,0.95)",
        backdropFilter: "blur(20px)",
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Chat input"
        className={cn(
          "min-h-[22px] flex-1 rounded-[22px] border bg-surface-elevated px-3.5 py-2.5",
          "text-[15px] text-text outline-none placeholder:text-text-3",
          "transition-shadow duration-150",
          hasValue
            ? "border-accent"
            : "border-border",
          "disabled:opacity-50",
        )}
        style={
          hasValue
            ? { boxShadow: "0 0 0 3px rgba(200,121,65,0.15)" }
            : undefined
        }
      />

      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !hasValue}
        aria-label="Send message"
        className={cn(
          "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-colors duration-200",
          hasValue
            ? "bg-accent"
            : "border border-border bg-surface-elevated",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 10L17 3L13.5 17L10 11.5L3 10Z"
            fill={hasValue ? "#0F0D0B" : "#6B6059"}
          />
        </svg>
      </button>
    </div>
  );
}
