import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/nav/AppHeader";
import { BottomNav } from "@/components/nav/BottomNav";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { PermissionPromptGate } from "@/components/notifications/PermissionPromptGate";
import { CopyToastProvider } from "@/components/notifications/CopyToastProvider";

export default async function MemberLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireUser();

  const firstInitial =
    (profile.full_name ?? "").charAt(0).toUpperCase() || "?";
  const isAdmin = profile.role === "admin";

  return (
    <CopyToastProvider>
      <div className="flex min-h-dvh flex-col bg-bg">
        <AppHeader
          initial={firstInitial}
          admin={isAdmin}
          right={<NotificationsBell unread={false} />}
        />

        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>

        <BottomNav />

        <PermissionPromptGate />
      </div>
    </CopyToastProvider>
  );
}
