import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decryptPassword } from "@/lib/crypto";
import { env } from "@/lib/env";
import type { Tables } from "@/lib/supabase/types";

/**
 * Server-side household context bundle that powers the AI chat system prompt.
 *
 * Decrypts every credential the user is entitled to see (their household's
 * private creds plus everything marked `is_shared`) so the model can answer
 * "what's the X password?" in one turn. Decryption only happens here, on the
 * server, behind RLS.
 */
export interface ChatContextCredential {
  service: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  category: Tables<"credentials">["category"];
}

export interface ChatContext {
  profile: Tables<"users">;
  households: Pick<Tables<"households">, "id" | "name">[];
  credentials: ChatContextCredential[];
  devices: Tables<"devices">[];
  knowledge: Tables<"knowledge_base">[];
}

export async function buildChatContext(): Promise<ChatContext> {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: profile, error: profileErr } = await sb
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileErr || !profile) throw new Error("profile_not_found");

  // Fetch household IDs the user is a member of.
  const { data: membershipRows } = await sb
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id);
  const householdIds = (membershipRows ?? []).map((r) => r.household_id);

  // Hydrate household names.
  const householdsRes = householdIds.length
    ? await sb.from("households").select("id, name").in("id", householdIds)
    : { data: [] as Pick<Tables<"households">, "id" | "name">[] };
  const households = householdsRes.data ?? [];

  // Credentials: rows belonging to one of the user's households OR globally shared.
  // PostgREST `.or()` with `.in.()` requires a non-empty list; when the user has
  // no households we fall back to a `is_shared.eq.true` filter alone.
  const credsQuery = sb.from("credentials").select("*");
  const credsRes = householdIds.length
    ? await credsQuery.or(
        `household_id.in.(${householdIds.join(",")}),is_shared.eq.true`,
      )
    : await credsQuery.eq("is_shared", true);

  // Devices are strictly per-household — skip the query entirely with no households.
  const devicesRes = householdIds.length
    ? await sb.from("devices").select("*").in("household_id", householdIds)
    : { data: [] as Tables<"devices">[] };

  // Knowledge: global rows (household_id NULL) OR rows tied to a user's household.
  const kbQuery = sb.from("knowledge_base").select("*");
  const kbRes = householdIds.length
    ? await kbQuery.or(
        `household_id.is.null,household_id.in.(${householdIds.join(",")})`,
      )
    : await kbQuery.is("household_id", null);

  const credentials: ChatContextCredential[] = (credsRes.data ?? []).map(
    (c) => ({
      service: c.service_name,
      username: c.username,
      password: decryptPassword(c.password_encrypted),
      url: c.url,
      notes: c.notes,
      category: c.category,
    }),
  );

  return {
    profile,
    households,
    credentials,
    devices: devicesRes.data ?? [],
    knowledge: kbRes.data ?? [],
  };
}

/**
 * Render the system prompt the model sees on every turn. Pure function so it
 * can be snapshot-tested. The admin name is parameterized via env so the same
 * code can ship under a different family-facing alias.
 */
export function renderSystemPrompt(ctx: ChatContext): string {
  const adminName = env.ADMIN_DISPLAY_NAME;
  const lines: string[] = [
    `You are Family Assistant, a warm and concise helper for ${ctx.profile.full_name}.`,
    `Speak in plain English. Avoid jargon. Keep answers under 3 short paragraphs unless asked for detail.`,
    `Reply in plain text only — do NOT use Markdown. No asterisks for bold, no backticks for code, no >, #, or -. The chat UI renders text literally, so Markdown shows up as visible junk characters.`,
    `When sharing a password, put it on its own line surrounded by blank lines so it's easy to read and copy. Do not wrap it in backticks.`,
    `If you cannot answer from the data below, call the askAlec tool with a one-sentence summary of the question — do not guess. ${adminName} is the family member who manages this app and will follow up directly.`,
    `Never invent credentials, device details, or instructions. Only use the facts listed below.`,
    ``,
    `## Households`,
    ...(ctx.households.length
      ? ctx.households.map((h) => `- ${h.name}`)
      : ["- (none on file)"]),
    ``,
    `## Credentials`,
    ...(ctx.credentials.length
      ? ctx.credentials.map((c) => {
          const user = c.username ? ` (user: ${c.username})` : "";
          const url = c.url ? ` · ${c.url}` : "";
          const notes = c.notes ? ` · notes: ${c.notes}` : "";
          return `- [${c.category}] ${c.service}${user}: password \`${c.password}\`${url}${notes}`;
        })
      : ["- (none on file)"]),
    ``,
    `## Devices`,
    ...(ctx.devices.length
      ? ctx.devices.map((d) => {
          const brand = d.brand ? `, ${d.brand}` : "";
          const model = d.model ? ` ${d.model}` : "";
          const notes = d.notes ? ` — ${d.notes}` : "";
          return `- ${d.name} (${d.type}${brand}${model})${notes}`;
        })
      : ["- (none on file)"]),
    ``,
    `## Knowledge Base`,
    ...(ctx.knowledge.length
      ? ctx.knowledge.flatMap((k) => [`### ${k.title}`, k.content])
      : ["(none on file)"]),
  ];
  return lines.join("\n");
}
