import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/nav/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { SessionKeepAlive } from "@/components/auth/SessionKeepAlive";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();

  const initial = (profile.full_name ?? "A").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader initial={initial} admin={true} />
      <AdminNav />
      {/* Admin pages don't have a BottomNav, so the scrollable main itself
          honors safe-area-inset-bottom — otherwise the last row could hide
          behind the iPhone home indicator on a tall list. */}
      <main
        className="flex flex-1 flex-col overflow-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {children}
      </main>
      <SessionKeepAlive />
    </div>
  );
}
