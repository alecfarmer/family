import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notifyAlecOfHelpRequest } from "@/lib/push";

/**
 * Manual escalation endpoint for the `/help` page.
 *
 * Distinct from the in-chat `askAlec` tool: this is the typed-message-in-a-form
 * path. No chat_transcript — the user is starting from scratch on the help page.
 */

const bodySchema = z.object({
  message: z.string().min(5).max(2000),
});

export async function POST(req: Request) {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { message } = parsed.data;

  // Find the user's primary household for the notification context.
  const { data: hm } = await sb
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const householdId = hm?.household_id ?? null;

  let householdName: string | undefined;
  if (householdId) {
    const { data: household } = await sb
      .from("households")
      .select("name")
      .eq("id", householdId)
      .single();
    householdName = household?.name;
  }

  const { data: profile } = await sb
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: hr, error: hrErr } = await sb
    .from("help_requests")
    .insert({
      user_id: user.id,
      household_id: householdId,
      message,
      chat_transcript: [],
      source: "help_page",
      status: "open",
    })
    .select("id")
    .single();

  if (hrErr || !hr) {
    return NextResponse.json(
      { error: "insert_failed", detail: hrErr?.message ?? "unknown" },
      { status: 500 },
    );
  }

  await notifyAlecOfHelpRequest({
    requestId: hr.id,
    question: message,
    userName: profile?.full_name ?? "A family member",
    householdName,
  });

  return NextResponse.json({ ok: true, id: hr.id });
}
