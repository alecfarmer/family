import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "./types";

/**
 * Refresh the Supabase auth session cookies on every request.
 *
 * Canonical pattern from
 * https://supabase.com/docs/guides/auth/server-side/nextjs — DO NOT add any
 * code between `createServerClient` and `supabase.auth.getUser()`. Subtle bugs
 * here cause random logouts.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do NOT remove this getUser() call — it refreshes the session.
  // Do NOT add code between createServerClient and getUser.
  await supabase.auth.getUser();

  return supabaseResponse;
}
