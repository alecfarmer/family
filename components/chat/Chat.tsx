"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { UserBubble, AssistantBubble } from "@/components/chat/MessageBubble";
import { CredentialReveal } from "@/components/chat/CredentialReveal";
import { EscalationCard } from "@/components/chat/EscalationCard";
import { EmptyState } from "@/components/chat/EmptyState";
import { ChatInput } from "@/components/chat/ChatInput";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type AnyPart = UIMessage["parts"][number];

function getUserText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<AnyPart, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Trim trailing newlines/spaces so the card sits flush against the text above. */
function trimRight(s: string): string {
  return s.replace(/\s+$/g, "");
}

/** Read the structured output of a tool part regardless of which v6 state it's in. */
function getToolOutput<T = unknown>(part: AnyPart): T | null {
  if (!("type" in part) || !part.type.startsWith("tool-")) return null;
  // AI SDK v6: when state === 'output-available' the result is on .output
  const p = part as { state?: string; output?: T };
  if (p.state === "output-available" && p.output !== undefined) return p.output;
  return null;
}

type RevealOutput = {
  service?: string;
  username?: string | null;
  password?: string;
  url?: string | null;
  isShared?: boolean;
  error?: string;
};

// ── component ─────────────────────────────────────────────────────────────────

export function Chat() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    void sendMessage({ text });
    setInput("");
  }

  function handleSelect(text: string) {
    void sendMessage({ text });
  }

  const isEmpty = messages.length === 0;
  const [sessionTime] = useState(() => formatTime(new Date()));
  const timePill = `Today · ${sessionTime}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {isEmpty ? (
        <EmptyState onSelect={handleSelect} />
      ) : (
        <div
          ref={scrollRef}
          className="flex flex-1 flex-col overflow-y-auto px-4 pb-2 pt-[18px]"
        >
          {/* Day separator */}
          <div className="mb-4 text-center text-[10.5px] uppercase tracking-[0.1em] text-text-3">
            {timePill}
          </div>

          {messages.map((message) => {
            if (message.role === "user") {
              const text = getUserText(message);
              if (!text) return null;
              return <UserBubble key={message.id}>{text}</UserBubble>;
            }

            if (message.role !== "assistant") return null;

            // Walk parts in order. Group adjacent text into one paragraph,
            // render reveal cards and escalation cards inline between text
            // runs. The whole sequence lives inside a single AssistantBubble
            // so the design's bubble border wraps text + cards together.
            const segments: Array<
              | { kind: "text"; text: string }
              | { kind: "reveal"; data: RevealOutput }
              | { kind: "escalate" }
              | { kind: "reveal-error"; message: string }
            > = [];

            let textBuf: string[] = [];
            const flushText = () => {
              if (!textBuf.length) return;
              const joined = textBuf
                .join(" ")
                .replace(/\s+([.,!?;:])/g, "$1")
                .replace(/\s{2,}/g, " ")
                .trim();
              if (joined) segments.push({ kind: "text", text: joined });
              textBuf = [];
            };

            for (const part of message.parts) {
              if (part.type === "text") {
                textBuf.push(part.text);
                continue;
              }
              if (part.type === "tool-revealCredential") {
                flushText();
                const out = getToolOutput<RevealOutput>(part);
                if (out) {
                  if (out.error) {
                    segments.push({ kind: "reveal-error", message: out.error });
                  } else if (out.service && out.password) {
                    segments.push({ kind: "reveal", data: out });
                  }
                }
                continue;
              }
              if (part.type === "tool-askAlec") {
                flushText();
                segments.push({ kind: "escalate" });
                continue;
              }
            }
            flushText();

            if (segments.length === 0) return null;

            return (
              <AssistantBubble key={message.id}>
                {segments.map((seg, i) => {
                  if (seg.kind === "text") {
                    return (
                      <p
                        key={i}
                        className={
                          i === 0
                            ? ""
                            : "mt-2.5"
                        }
                      >
                        {trimRight(seg.text)}
                      </p>
                    );
                  }
                  if (seg.kind === "reveal") {
                    return (
                      <CredentialReveal
                        key={i}
                        service={seg.data.service!}
                        username={seg.data.username ?? undefined}
                        password={seg.data.password!}
                        url={seg.data.url ?? undefined}
                        sharedWith={seg.data.isShared}
                      />
                    );
                  }
                  if (seg.kind === "reveal-error") {
                    return (
                      <p key={i} className="mt-2 text-[13px] text-text-3 italic">
                        {seg.message}
                      </p>
                    );
                  }
                  if (seg.kind === "escalate") {
                    return (
                      <div key={i} className="mt-2.5 -mx-1">
                        <EscalationCard className="mb-0" />
                      </div>
                    );
                  }
                  return <Fragment key={i} />;
                })}
              </AssistantBubble>
            );
          })}

          {/* Streaming indicator — only when no text yet */}
          {isStreaming &&
            (messages.at(-1)?.role !== "assistant" ||
              !getUserText(messages.at(-1)!)) && (
              <div className="mb-4 flex max-w-[86%] flex-col items-start">
                <span className="mb-1 ml-1 font-display text-[12.5px] font-semibold uppercase tracking-[0.14em] text-accent">
                  FAMILY
                </span>
                <div
                  className="border border-border bg-surface px-3.5 py-3"
                  style={{ borderRadius: "18px 18px 18px 4px" }}
                >
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse text-text-3">•</span>
                    <span
                      className="animate-pulse text-text-3"
                      style={{ animationDelay: "150ms" }}
                    >
                      •
                    </span>
                    <span
                      className="animate-pulse text-text-3"
                      style={{ animationDelay: "300ms" }}
                    >
                      •
                    </span>
                  </span>
                </div>
              </div>
            )}
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isStreaming}
      />
    </div>
  );
}
