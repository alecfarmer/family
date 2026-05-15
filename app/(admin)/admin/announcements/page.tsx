import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import {
  AnnouncementsClient,
  type AnnouncementRow,
  type HouseholdOption,
} from "./AnnouncementsClient";

export const dynamic = "force-dynamic";

// `announcements` isn't yet in `lib/supabase/types.ts` (hand-written) and
// the task spec forbids editing that file. Cast the client to the untyped
// SupabaseClient just for this table, and inline the row shape we expect
// back from the join.
type AnnouncementRowDb = {
  id: string;
  household_id: string | null;
  author_id: string | null;
  title: string;
  body: string;
  created_at: string;
  expires_at: string | null;
  users: { full_name: string } | { full_name: string }[] | null;
};

export default async function AdminAnnouncementsPage() {
  const { profile, sb } = await requireAdmin();
  const untypedSb = sb as unknown as SupabaseClient;

  // Pull all announcements (RLS keeps anyone but app admins / household
  // admins from seeing the full set, but `requireAdmin()` above means
  // only app admins reach this page today). Join users for author label.
  const [annRes, housesRes] = await Promise.all([
    untypedSb
      .from("announcements")
      .select(
        "id, household_id, author_id, title, body, created_at, expires_at, users(full_name)",
      )
      .order("created_at", { ascending: false }),
    sb.from("households").select("id, name").order("name", { ascending: true }),
  ]);

  const annRows = (annRes.data ?? []) as AnnouncementRowDb[];

  const announcements: AnnouncementRow[] = annRows.map((r) => {
    const author = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      household_id: r.household_id,
      author_id: r.author_id,
      author_name: author?.full_name ?? null,
      title: r.title,
      body: r.body,
      created_at: r.created_at,
      expires_at: r.expires_at,
    };
  });

  const households: HouseholdOption[] = (housesRes.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-1">
        <h1
          className="m-0 font-display font-semibold text-text"
          style={{ fontSize: 28, letterSpacing: "0.01em" }}
        >
          Announcements
        </h1>
        <p className="mt-1 font-sans text-[13px] text-text-2">
          Short notes for the family. Active posts show up on each member’s
          /activity feed for 30 days.
        </p>
      </div>
      <AnnouncementsClient
        announcements={announcements}
        households={households}
        isAppAdmin={profile.role === "admin"}
      />
    </div>
  );
}
