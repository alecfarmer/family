import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decryptPassword } from "@/lib/crypto";
import { env } from "@/lib/env";
import { getActiveHouseholdScope } from "@/lib/activeHousehold";
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
  id: string;
  service: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  category: Tables<"credentials">["category"];
  isShared: boolean;
  householdId: string | null;
  /** Human-readable household name (null for credentials not tied to any). */
  householdName: string | null;
}

export interface ChatContext {
  profile: Tables<"users">;
  households: Pick<Tables<"households">, "id" | "name">[];
  credentials: ChatContextCredential[];
  devices: Tables<"devices">[];
  knowledge: Tables<"knowledge_base">[];
  /** The user's currently-active household scope (drives filtering above). */
  scope:
    | { kind: "all" }
    | { kind: "household"; id: string; name: string };
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
  // NOTE: admin-only private memory lives in a separate `credential_admin_notes`
  // table and is intentionally excluded from this select so it never leaks into
  // the AI chat system prompt. Only `credentials.notes` is AI-visible.
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

  // Lookup table so we can attach the household name to each credential
  // without an N+1 query.
  const householdNameById = new Map(households.map((h) => [h.id, h.name]));

  const allCredentials: ChatContextCredential[] = (credsRes.data ?? []).map(
    (c) => ({
      id: c.id,
      service: c.service_name,
      username: c.username,
      password: decryptPassword(c.password_encrypted),
      url: c.url,
      notes: c.notes,
      category: c.category,
      isShared: c.is_shared,
      householdId: c.household_id,
      householdName: c.household_id
        ? (householdNameById.get(c.household_id) ?? null)
        : null,
    }),
  );

  // Apply the user's global household scope so the AI (and quick-match) see
  // only the credentials + devices relevant to what they're currently
  // viewing. "All" passes through; a specific household keeps that
  // household's items PLUS globally shared rows for credentials, and only
  // that household's devices.
  const scope = await getActiveHouseholdScope();
  const credentials =
    scope.kind === "all"
      ? allCredentials
      : allCredentials.filter(
          (c) => c.householdId === scope.id || c.isShared,
        );

  const allDevices = devicesRes.data ?? [];
  const devices =
    scope.kind === "all"
      ? allDevices
      : allDevices.filter((d) => d.household_id === scope.id);

  return {
    profile,
    households,
    credentials,
    devices,
    knowledge: kbRes.data ?? [],
    scope,
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
    `Reply in plain text only — do NOT use Markdown. No asterisks, backticks, >, #, or hyphens for bullets. The chat UI renders text literally.`,
    ``,
    `## How to surface a credential`,
    `When the user asks about a service in the Credentials list below, do NOT type out the password or username in your reply. Call the revealCredential tool with the exact service name instead — the UI will render a copy-friendly card with eye-toggle and per-field copy buttons. Your text reply should just be a short sentence like "Here's the Home WiFi info:" or "All yours:" — let the card do the rest. If the credential has useful notes, mention them naturally in plain text below the card.`,
    ``,
    `## When to escalate`,
    `If the user asks about a service that is NOT in the Credentials list (and isn't covered by the Devices or Knowledge Base), call the askAlec tool with a one-sentence summary instead of guessing. ${adminName} is the family member who manages this app and will follow up directly.`,
    `Never invent credentials, device details, or instructions. Only use the facts listed below.`,
    ``,
    // Tell the model what the user is currently viewing so it can frame
    // ambiguous answers naturally. When the scope is a single household, the
    // credentials / devices below have already been filtered to that scope
    // (plus globally shared credentials).
    ctx.scope.kind === "household"
      ? `## Current view\nThe user is viewing the "${ctx.scope.name}" household. Answers should default to items at "${ctx.scope.name}" unless the user names a different one.`
      : "",
    ctx.scope.kind === "household" ? "" : "",
    `## Households`,
    ...(ctx.households.length
      ? ctx.households.map((h) => `- ${h.name}`)
      : ["- (none on file)"]),
    ``,
    `## Credentials available (call revealCredential with the exact service name)`,
    ctx.households.length > 1
      ? `The user is in multiple households — if the same service (e.g. "WiFi") exists in more than one, ask which household before calling revealCredential.`
      : "",
    ...(ctx.credentials.length
      ? ctx.credentials.map((c) => {
          const household = c.householdName
            ? ` @ ${c.householdName}`
            : c.isShared
              ? " (shared)"
              : "";
          const notes = c.notes ? ` — notes: ${c.notes}` : "";
          return `- ${c.service} [${c.category}]${household}${notes}`;
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
