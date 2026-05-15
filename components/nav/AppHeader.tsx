import type { ReactNode } from "react";
import Link from "next/link";
import { FamilyMark } from "@/components/brand/FamilyMark";
import { Wordmark } from "@/components/brand/Wordmark";

type AppHeaderProps = {
  initial: string;
  admin?: boolean;
  right?: ReactNode;
  /** When true, the wordmark links back to the member home (chat). Default true. */
  homeLink?: boolean;
  /** When true, the Admin badge is shown and links to /admin. Default true on admin. */
  adminLink?: boolean;
};

export function AppHeader({
  initial,
  admin = false,
  right,
  homeLink = true,
  adminLink = true,
}: AppHeaderProps) {
  // Top padding honors safe-area-inset-top so the header clears the iPhone
  // status bar + Dynamic Island on phones that have one (~59 px) and shrinks
  // gracefully on phones without (~20 px on iPhone SE / most Android).
  return (
    <div
      className="flex items-center justify-between border-b border-border bg-bg pb-3.5 pl-5 pr-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
      }}
    >
      <div className="flex items-center gap-2.5">
        {homeLink ? (
          <Link
            href="/"
            aria-label="Family home"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <FamilyMark size={22} color="var(--color-accent)" />
            <Wordmark size={18} />
          </Link>
        ) : (
          <>
            <FamilyMark size={22} color="var(--color-accent)" />
            <Wordmark size={18} />
          </>
        )}

        {admin &&
          (adminLink ? (
            <Link
              href="/admin"
              aria-label="Open admin dashboard"
              className="ml-1 rounded-[4px] border border-accent font-sans font-semibold uppercase text-accent transition-colors hover:bg-accent/10"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                padding: "3px 7px",
              }}
            >
              Admin
            </Link>
          ) : (
            <span
              className="ml-1 rounded-[4px] border border-accent font-sans font-semibold uppercase text-accent"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                padding: "3px 7px",
              }}
            >
              Admin
            </span>
          ))}
      </div>
      <div className="flex items-center gap-2.5">
        {right}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full font-sans font-semibold text-bg"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent), #8a4f29)",
            fontSize: 13,
            boxShadow: "0 0 0 1px var(--color-border-strong)",
          }}
        >
          {initial}
        </div>
      </div>
    </div>
  );
}
