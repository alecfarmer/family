"use client";

import { useRouter } from "next/navigation";

type NotificationsBellProps = {
  unread?: boolean;
};

export function NotificationsBell({ unread = false }: NotificationsBellProps) {
  const router = useRouter();

  return (
    <button
      aria-label={unread ? "Notifications — unread items" : "Notifications"}
      onClick={() => router.push("/activity")}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-text-2 transition-colors hover:text-text"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 10a6 6 0 0 1 12 0v4l2 2H4l2-2v-4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M10 18a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      {unread && (
        <span
          aria-hidden
          className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent"
          style={{ boxShadow: "0 0 6px var(--color-accent)" }}
        />
      )}
    </button>
  );
}
