import { NextResponse } from "next/server";
import { z } from "zod";
import { buildChatContext } from "@/lib/chatContext";
import { quickMatch } from "@/lib/chat/quickMatch";
import { logAccess } from "@/lib/accessLog";

// Same auth shape as /api/chat — buildChatContext throws "unauthorized" when
// there's no session, which the catch below maps to a 401.
const bodySchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const ctx = await buildChatContext();
    const result = quickMatch(parsed.data.text, ctx.credentials);

    if (!result.matched) {
      // Don't log a "chat_message" here — the AI fallback path on /api/chat
      // will write that row when the client retries. Avoid double-logging.
      return NextResponse.json({ matched: false, reason: result.reason });
    }

    const cred = result.credential;

    // We DID handle the chat turn — write both audit rows the AI path writes,
    // so the access log reads the same regardless of which path served the
    // reveal.
    await Promise.all([
      logAccess({
        action: "chat_message",
        metadata: { content: parsed.data.text.slice(0, 500), via: "quick" },
      }),
      logAccess({
        action: "viewed_credential_in_chat",
        resourceId: cred.id,
        resourceType: "credential",
        metadata: { service: cred.service, via: "quick" },
      }),
    ]);

    return NextResponse.json({
      matched: true,
      reason: result.reason,
      credential: {
        id: cred.id,
        service: cred.service,
        username: cred.username,
        password: cred.password,
        url: cred.url,
        isShared: cred.isShared,
        householdId: cred.householdId,
        householdName: cred.householdName,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal_error";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "internal_error", detail: message },
      { status: 500 },
    );
  }
}
