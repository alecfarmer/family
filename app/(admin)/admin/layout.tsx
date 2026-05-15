import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/nav/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();

  const initial = (profile.full_name ?? "A").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader initial={initial} admin={true} />
      <AdminNav />
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
