import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function requireUser() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?error=no_profile");
  return { user, profile, sb };
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}
