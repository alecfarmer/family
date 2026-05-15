import type { ReactNode } from "react";
import { FamilyMark } from "@/components/brand/FamilyMark";
import { Wordmark } from "@/components/brand/Wordmark";

type AppHeaderProps = {
  initial: string;
  admin?: boolean;
  right?: ReactNode;
};

export function AppHeader({ initial, admin = false, right }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg pt-[60px] pb-3.5 pl-5 pr-4">
      <div className="flex items-center gap-2.5">
        <FamilyMark size={22} color="var(--color-accent)" />
        <Wordmark size={18} />
        {admin && (
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
        )}
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
