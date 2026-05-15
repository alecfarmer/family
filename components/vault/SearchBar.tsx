import { cn } from "@/components/ui/cn";

type SearchBarProps = {
  className?: string;
};

export function SearchBar({ className }: SearchBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-border bg-surface-elevated px-3 py-2.5",
        className,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" stroke="var(--color-text-3)" strokeWidth="1.6" />
        <path
          d="M13.5 13.5L17 17"
          stroke="var(--color-text-3)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-sans text-[14px] text-text-3">
        Search credentials
      </span>
    </div>
  );
}
