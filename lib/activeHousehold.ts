import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Global household-scope cookie. Single source of truth for what the user is
 * currently viewing:
 *
 *   - { kind: "all" }       → no filter (default)
 *   - { kind: "household" } → only that household + globally shared rows
 *
 * Stored as `active_household=all` or `active_household=<uuid>`. The cookie is
 * validated against the user's household_members on every read — a tampered
 * value silently falls back to "all" so an attacker can't even hint at
 * household IDs they aren't a member of.
 */

const COOKIE_NAME = "active_household";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HouseholdScope =
  | { kind: "all" }
  | { kind: "household"; id: string; name: string };

export async function getActiveHouseholdScope(): Promise<HouseholdScope> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw || raw === "all") return { kind: "all" };
  if (!UUID_RE.test(raw)) return { kind: "all" };

  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { kind: "all" };

  // Confirm the user is a member of the requested household AND fetch its
  // name in the same hop. Falls back to "all" if not a member (stale cookie).
  const { data } = await sb
    .from("household_members")
    .select("household_id, households(id, name)")
    .eq("user_id", user.id)
    .eq("household_id", raw)
    .maybeSingle();

  const hh = data?.households as { id: string; name: string } | null | undefined;
  if (!hh) return { kind: "all" };

  return { kind: "household", id: hh.id, name: hh.name };
}

/** Server-only helper to set the cookie. Used by the /api/active-household route. */
export async function setActiveHouseholdCookieValue(value: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false, // intentionally readable from JS for hydration
  });
}
