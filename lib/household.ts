import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";

export type UserHousehold = { id: string; name: string };

type MembershipJoinRow = {
  household_id: string;
  households: UserHousehold | UserHousehold[] | null;
};

function pickHousehold(m: MembershipJoinRow): UserHousehold | null {
  if (!m.households) return null;
  return Array.isArray(m.households) ? (m.households[0] ?? null) : m.households;
}

/**
 * Returns every household the user is a member of, with names, sorted
 * alphabetically.
 *
 * Wrapped in React `cache()` so the same request can call this from the
 * layout (for the switcher) AND from a child page (for the credential
 * form's household select) without making two DB roundtrips. Dedupes
 * per server request, not across requests.
 */
export const getUserHouseholds = cache(
  async (userId: string): Promise<UserHousehold[]> => {
    const sb = await createSupabaseServer();
    const { data } = await sb
      .from("household_members")
      .select("household_id, households(id, name)")
      .eq("user_id", userId);

    return ((data as MembershipJoinRow[] | null) ?? [])
      .map(pickHousehold)
      .filter((h): h is UserHousehold => h !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);

/**
 * Admin variant — all households in the system, alphabetized.
 * Cached per request alongside `getUserHouseholds`.
 */
export const getAllHouseholds = cache(async (): Promise<UserHousehold[]> => {
  const sb = await createSupabaseServer();
  const { data } = await sb.from("households").select("id, name").order("name");
  return data ?? [];
});
