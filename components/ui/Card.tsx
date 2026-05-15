import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type CardProps = {
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function Card({ children, accent = false, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-[14px] p-3.5",
        accent && "border-l-[3px] border-l-accent",
        className,
      )}
    >
      {children}
    </div>
  );
}
