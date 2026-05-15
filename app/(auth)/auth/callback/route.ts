import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notifyAlecOfFirstLogin } from "@/lib/push";
import { logAccess } from "@/lib/accessLog";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=expired", env.NEXT_PUBLIC_SITE_URL),
    );
  }

  const sb = await createSupabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(
      new URL("/login?error=expired", env.NEXT_PUBLIC_SITE_URL),
    );
  }

  const userId = data.session.user.id;

  // Check for any prior login events before logging this one.
  const { data: priorLogs } = await sb
    .from("access_log")
    .select("id")
    .eq("user_id", userId)
    .eq("action", "logged_in")
    .limit(1);

  const isFirstLogin = !priorLogs || priorLogs.length === 0;

  // Log this access event.
  await logAccess({ action: "logged_in" });

  // Notify Alec only on first login.
  if (isFirstLogin) {
    const { data: userRow } = await sb
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();

    const userName = userRow?.full_name ?? "A family member";
    await notifyAlecOfFirstLogin({ userName }).catch(() => {
      // Non-fatal — push may not be configured yet.
    });
  }

  return NextResponse.redirect(new URL("/", env.NEXT_PUBLIC_SITE_URL));
}
