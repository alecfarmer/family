"use client";

type CopyToastProps = {
  label?: string;
};

export function CopyToast({ label = "Password copied" }: CopyToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[110px] z-30 -translate-x-1/2"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="flex items-center gap-2.5 rounded-full px-[18px] py-2.5 pl-3.5"
        style={{
          background: "rgba(35,31,27,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(200,121,65,0.25)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(200,121,65,0.15)",
          whiteSpace: "nowrap",
        }}
      >
        {/* Check circle */}
        <div
          className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-accent"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2.5 6.5l2.5 2.5 5-6"
              stroke="var(--color-bg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span
          className="font-sans font-medium text-text"
          style={{ fontSize: 13.5, letterSpacing: "0.01em" }}
        >
          {label}
        </span>
        <span
          className="font-sans text-text-3"
          style={{ fontSize: 11, letterSpacing: "0.06em" }}
        >
          · clears in 30s
        </span>
      </div>
    </div>
  );
}
