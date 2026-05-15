import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/nav/AppHeader";
import { BottomNav } from "@/components/nav/BottomNav";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { PermissionPromptGate } from "@/components/notifications/PermissionPromptGate";
import { CopyToastProvider } from "@/components/notifications/CopyToastProvider";
import {
  HouseholdSwitcher,
  type SwitcherHousehold,
} from "@/components/nav/HouseholdSwitcher";
import { getActiveHouseholdScope } from "@/lib/activeHousehold";

type MembershipRow = {
  household_id: string;
  households: { id: string; name: string } | { id: string; name: string }[] | null;
};

function pickHousehold(
  m: MembershipRow,
): { id: string; name: string } | null {
  // PostgREST returns the joined row as an object when the FK is one-to-one
  // and as an array otherwise — type-narrow defensively.
  if (!m.households) return null;
  if (Array.isArray(m.households)) return m.households[0] ?? null;
  return m.households;
}

export default async function MemberLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, sb } = await requireUser();

  const firstInitial =
    (profile.full_name ?? "").charAt(0).toUpperCase() || "?";
  const isAdmin = profile.role === "admin";

  // Households the user belongs to → feeds the global switcher trigger and
  // the picker sheet. We don't fetch admin's full household list here — the
  // switcher is about the user's *own* scope.
  const { data: memberships } = await sb
    .from("household_members")
    .select("household_id, households(id, name)")
    .eq("user_id", profile.id);

  const households: SwitcherHousehold[] = (
    (memberships as MembershipRow[] | null) ?? []
  )
    .map(pickHousehold)
    .filter((h): h is SwitcherHousehold => h !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const scope = await getActiveHouseholdScope();

  return (
    <CopyToastProvider>
      <div className="flex min-h-dvh flex-col bg-bg">
        <AppHeader
          initial={firstInitial}
          admin={isAdmin}
          right={
            <>
              <HouseholdSwitcher households={households} current={scope} />
              <NotificationsBell unread={false} />
            </>
          }
        />

        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>

        <BottomNav />

        <PermissionPromptGate />
      </div>
    </CopyToastProvider>
  );
}
