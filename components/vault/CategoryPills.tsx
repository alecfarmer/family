"use client";

import { cn } from "@/components/ui/cn";

type CategoryPillsProps = {
  categories: string[];
  selected: string;
  onChange: (cat: string) => void;
};

export function CategoryPills({
  categories,
  selected,
  onChange,
}: CategoryPillsProps) {
  const all = ["All", ...categories];

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {all.map((cat) => {
        const isActive = cat === selected;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-[7px] font-sans text-[13px] font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-accent text-bg border-transparent"
                : "bg-surface text-text-2 border border-border",
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
