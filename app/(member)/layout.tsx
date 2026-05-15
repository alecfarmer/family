import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/nav/AppHeader";
import { BottomNav } from "@/components/nav/BottomNav";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { PermissionPromptGate } from "@/components/notifications/PermissionPromptGate";
import { CopyToastProvider } from "@/components/notifications/CopyToastProvider";
import { HouseholdSwitcher } from "@/components/nav/HouseholdSwitcher";
import { SessionKeepAlive } from "@/components/auth/SessionKeepAlive";
import { getActiveHouseholdScope } from "@/lib/activeHousehold";
import { getUserHouseholds } from "@/lib/household";

export default async function MemberLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireUser();

  const firstInitial =
    (profile.full_name ?? "").charAt(0).toUpperCase() || "?";
  const isAdmin = profile.role === "admin";

  // cache()-wrapped — child pages that also call this in the same render get
  // the result from the request-scoped cache.
  const households = await getUserHouseholds(profile.id);

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
        <SessionKeepAlive />
      </div>
    </CopyToastProvider>
  );
}
