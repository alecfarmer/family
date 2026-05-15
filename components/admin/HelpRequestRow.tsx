"use client";

import { z } from "zod";
import { Badge } from "@/components/ui/Badge";
import { AssistantBubble, UserBubble } from "@/components/chat/MessageBubble";
import { ResolveForm } from "@/components/admin/ResolveForm";
import type { Tables } from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type HelpRequestData = Tables<"help_requests"> & {
  user_full_name: string;
  household_name: string | null;
  requester_email: string | null;
};

// Zod schema for chat_transcript — matches the shape written by /api/chat
// (askAlec tool): { role: 'user'|'assistant', content: string, createdAt: string }
const transcriptMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string().optional(),
});

const transcriptSchema = z.array(transcriptMessageSchema);

// ── Helper ────────────────────────────────────────────────────────────────────

function parseTranscript(raw: unknown) {
  const result = transcriptSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HelpRequestRow({
  request,
  expanded,
}: {
  request: HelpRequestData;
  expanded: boolean;
}) {
  const transcript = parseTranscript(request.chat_transcript);
  const hasTranscript =
    request.source !== "help_page" &&
    transcript !== null &&
    transcript.length > 0;

  const mailtoHref = request.requester_email
    ? `mailto:${request.requester_email}?subject=${encodeURIComponent("Re: your Family help request")}&body=${encodeURIComponent(`Hi,\n\nRegarding your help request:\n"${request.message}"\n\n`)}`
    : null;

  return (
    <details
      className="group rounded-[14px] border border-border bg-surface open:bg-surface"
      open={expanded}
    >
      {/* Header (clickable summary — chevron + chat-message preview) */}
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm font-medium text-text">
              {request.user_full_name}
            </span>
            {request.household_name && (
              <span className="font-sans text-xs text-text-3">
                · {request.household_name}
              </span>
            )}
            <Badge tone={request.status === "open" ? "warning" : "success"}>
              {request.status}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-1 font-sans text-sm text-text-2">
            {request.message}
          </p>
          <div className="mt-0.5 font-sans text-xs text-text-3">
            {formatDate(request.created_at)}
            {request.resolved_at && (
              <> · resolved {formatDate(request.resolved_at)}</>
            )}
          </div>
        </div>

        {/* Action buttons + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          {mailtoHref && (
            <a
              href={mailtoHref}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-text-2 hover:bg-surface-elevated"
            >
              Reply via email
            </a>
          )}
          {!mailtoHref && (
            <span className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-text-3">
              Reply (out-of-band)
            </span>
          )}
          <svg
            className="h-4 w-4 text-text-3 transition-transform group-open:rotate-180"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </summary>

      {/* Expanded content */}
      <div className="border-t border-border px-4 pb-4">
          {/* AI summary / message */}
          <div className="mt-4 rounded-lg bg-surface-elevated p-3">
            <div className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-widest text-accent">
              Summary
            </div>
            <p className="font-sans text-sm leading-relaxed text-text">
              {request.message}
            </p>
          </div>

          {/* Transcript */}
          {hasTranscript && transcript ? (
            <div className="mt-4">
              <div className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-widest text-text-3">
                Chat Transcript
              </div>
              <div className="flex flex-col">
                {transcript.map((msg, i) => {
                  const ts = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : undefined;
                  return msg.role === "assistant" ? (
                    <AssistantBubble key={i} ts={ts}>
                      {msg.content}
                    </AssistantBubble>
                  ) : (
                    <UserBubble key={i} ts={ts}>
                      {msg.content}
                    </UserBubble>
                  );
                })}
              </div>
            </div>
          ) : request.source !== "help_page" ? (
            <p className="mt-3 font-sans text-xs text-text-3 italic">
              Transcript unavailable
            </p>
          ) : null}

          {/* Footer actions */}
          {request.status === "open" && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 font-sans text-xs font-medium text-text-2">
                Resolve this request
              </p>
              <ResolveForm requestId={request.id} />
            </div>
          )}

          {request.status === "resolved" && request.resolved_notes && (
            <div className="mt-4 rounded-lg bg-success/10 p-3">
              <div className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-widest text-success">
                Resolution Notes
              </div>
              <p className="font-sans text-sm text-text">{request.resolved_notes}</p>
            </div>
          )}
      </div>
    </details>
  );
}
