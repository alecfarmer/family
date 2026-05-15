import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type UserBubbleProps = {
  children: ReactNode;
  ts?: string;
  className?: string;
};

export function UserBubble({ children, ts, className }: UserBubbleProps) {
  return (
    <div
      className={cn(
        "mb-4 flex max-w-[86%] flex-col items-end",
        "ml-auto",
        className,
      )}
    >
      <div
        className="whitespace-pre-wrap break-words bg-chat-user px-3.5 py-2.5 text-[14.5px] leading-[1.45] text-text"
        style={{
          borderRadius: "18px 18px 4px 18px",
          border: "1px solid #2A3F2C",
        }}
      >
        {children}
      </div>
      {ts && (
        <span className="mt-1 mr-1.5 text-[10.5px] text-text-3">{ts}</span>
      )}
    </div>
  );
}

export type AssistantBubbleProps = {
  children: ReactNode;
  ts?: string;
  className?: string;
};

export function AssistantBubble({ children, ts, className }: AssistantBubbleProps) {
  return (
    <div
      className={cn(
        "mb-4 flex max-w-[86%] flex-col items-start",
        className,
      )}
    >
      <span className="mb-1 ml-1 font-display text-[12.5px] font-semibold uppercase tracking-[0.14em] text-accent">
        FAMILY
      </span>
      <div
        className="whitespace-pre-wrap break-words border border-border bg-surface px-3.5 py-3 text-[14.5px] leading-[1.45] text-text"
        style={{ borderRadius: "18px 18px 18px 4px" }}
      >
        {children}
      </div>
      {ts && (
        <span className="mt-1 ml-1.5 text-[10.5px] text-text-3">{ts}</span>
      )}
    </div>
  );
}
