import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
  type TextUIPart,
} from "ai";
import { z } from "zod";
import { buildChatContext, renderSystemPrompt } from "@/lib/chatContext";
import { logAccess } from "@/lib/accessLog";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notifyAlecOfHelpRequest } from "@/lib/push";
import { env } from "@/lib/env";

export const maxDuration = 30;

/**
 * Extract joined plain text from a UIMessage's parts array.
 * v6 messages no longer carry a top-level `.content` string — text lives in
 * `parts: Array<{ type: 'text'; text: string } | ...>`.
 */
function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is TextUIPart => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages: UIMessage[] };
  // Keep the original UIMessages around — the askAlec tool needs `.parts` to
  // build the transcript snapshot. `streamText` itself wants ModelMessages.
  const uiMessages = body.messages ?? [];

  const ctx = await buildChatContext();
  const adminName = env.ADMIN_DISPLAY_NAME;

  const last = uiMessages.at(-1);
  await logAccess({
    action: "chat_message",
    metadata: { content: last ? extractText(last).slice(0, 500) : "" },
  });

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: "anthropic/claude-sonnet-4-6",
    system: renderSystemPrompt(ctx),
    messages: modelMessages,
    stopWhen: stepCountIs(3),
    tools: {
      askAlec: tool({
        description: `Use when you cannot confidently answer from the context above. Captures the full conversation so ${adminName} has context.`,
        inputSchema: z.object({
          question: z
            .string()
            .describe("One-sentence summary of what the user asked."),
        }),
        execute: async ({ question }) => {
          const sb = await createSupabaseServer();
          const {
            data: { user },
          } = await sb.auth.getUser();
          if (!user) {
            return {
              escalated: false,
              message: "Unable to escalate — not signed in.",
            };
          }

          const { data: hm } = await sb
            .from("household_members")
            .select("household_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          // Snapshot the conversation so far — strip system messages, keep
          // only user/assistant turns. Pull text out of `parts` so the admin
          // dashboard renders the same bubbles the user saw.
          const now = new Date().toISOString();
          const transcript = uiMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role,
              content: extractText(m),
              createdAt: now,
            }));

          const { data: hr, error: hrErr } = await sb
            .from("help_requests")
            .insert({
              user_id: user.id,
              household_id: hm?.household_id ?? null,
              message: question,
              chat_transcript: transcript,
              source: "chat",
              status: "open",
            })
            .select("id")
            .single();

          if (hrErr || !hr) {
            return {
              escalated: false,
              message: `I tried to send this to ${adminName} but something went wrong. Please try again in a moment.`,
            };
          }

          await notifyAlecOfHelpRequest({
            requestId: hr.id,
            question,
            userName: ctx.profile.full_name,
            householdName: ctx.households[0]?.name,
          });

          return {
            escalated: true,
            message: `I've sent this to ${adminName} along with our conversation so he has the full context. He'll reach out to you directly.`,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
