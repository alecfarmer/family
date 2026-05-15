"use client";

import { useRouter } from "next/navigation";

export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();

  if (unreadCount === 0) {
    return (
      <span className="font-sans text-[12.5px] font-medium text-text-3">
        All caught up
      </span>
    );
  }

  return (
    <button
      onClick={() => router.refresh()}
      className="font-sans text-[12.5px] font-medium text-accent active:opacity-70"
      style={{ letterSpacing: "0.02em" }}
    >
      Mark all read
    </button>
  );
}
