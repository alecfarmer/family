"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Households", href: "/admin/households" },
  { label: "Users", href: "/admin/users" },
  { label: "Credentials", href: "/admin/credentials" },
  // Renegotiations lives on the member side (/renegotiations) because it's
  // reachable by household admins too — but surface a shortcut here so app
  // admins can jump straight to it from the admin nav.
  { label: "Renegotiations", href: "/renegotiations" },
  { label: "Devices", href: "/admin/devices" },
  { label: "Knowledge", href: "/admin/knowledge" },
  { label: "Logs", href: "/admin/logs" },
  { label: "Help Requests", href: "/admin/help-requests" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1.5 overflow-x-auto border-b border-border bg-bg px-4 py-2.5"
      style={{ scrollbarWidth: "none" }}
    >
      {NAV_ITEMS.map(({ label, href }) => {
        // Exact match for dashboard, prefix match for sub-pages
        const isActive =
          href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors",
              isActive
                ? "bg-accent text-bg"
                : "text-text-2 hover:bg-surface hover:text-text",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
