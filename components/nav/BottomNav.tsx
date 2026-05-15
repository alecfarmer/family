"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

type NavItem = {
  id: "chat" | "vault" | "devices" | "help";
  label: string;
  href: string;
};

const ITEMS: NavItem[] = [
  { id: "chat", label: "Chat", href: "/" },
  { id: "vault", label: "Vault", href: "/vault" },
  { id: "devices", label: "Devices", href: "/devices" },
  { id: "help", label: "Help", href: "/help" },
];

function NavIcon({ id, c }: { id: NavItem["id"]; c: string }) {
  if (id === "chat") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5v-3.5h-.5A2.5 2.5 0 0 1 2 14.5v-8"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  if (id === "vault") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="10" width="18" height="11" rx="2" stroke={c} strokeWidth="1.6" />
        <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="15.5" r="1.4" fill={c} />
      </svg>
    );
  }
  if (id === "devices") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="13" height="10" rx="1.5" stroke={c} strokeWidth="1.6" />
        <rect x="14" y="10" width="7" height="11" rx="1.2" stroke={c} strokeWidth="1.6" />
        <path d="M6 18h6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.6" />
      <path
        d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="17" r="1" fill={c} />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  // pb honors the iPhone home-indicator safe area on phones that have one
  // (≈34 px on iPhone 15+ with Dynamic Island) and falls back to 12 px on
  // phones without (iPhone SE, Android). The nav background extends all the
  // way to the bottom of the screen — no dark gap underneath the labels.
  return (
    <nav
      className="flex justify-around border-t border-border bg-bg/90 px-2 pt-2.5 backdrop-blur-2xl"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      {ITEMS.map((it) => {
        const active = isActive(pathname, it.href);
        const color = active ? "var(--color-accent)" : "var(--color-text-3)";
        return (
          <Link
            key={it.id}
            href={it.href}
            className={cn(
              "flex min-h-[48px] min-w-[64px] flex-col items-center gap-1 rounded-xl px-3.5 py-1.5",
              active ? "text-accent" : "text-text-3",
            )}
          >
            <NavIcon id={it.id} c={color} />
            <span
              className="font-sans font-medium"
              style={{ fontSize: 10.5, letterSpacing: "0.02em" }}
            >
              {it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
