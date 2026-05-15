"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { UserBubble, AssistantBubble } from "@/components/chat/MessageBubble";
import { EscalationCard } from "@/components/chat/EscalationCard";
import { EmptyState } from "@/components/chat/EmptyState";
import { ChatInput } from "@/components/chat/ChatInput";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getTextFromParts(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<UIMessage["parts"][number], { type: "text" }> =>
      p.type === "text",
    )
    .map((p) => p.text)
    .join("");
}

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

  // Time pill — use current session time (UIMessage has no createdAt in v6)
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
              const text = getTextFromParts(message);
              if (!text) return null;
              return (
                <UserBubble key={message.id}>{text}</UserBubble>
              );
            }

            if (message.role === "assistant") {
              // Collect text and tool parts in order
              const textContent = getTextFromParts(message);
              const hasEscalation = message.parts.some(
                (p) => p.type === "tool-askAlec",
              );

              return (
                <div key={message.id}>
                  {textContent && (
                    <AssistantBubble>{textContent}</AssistantBubble>
                  )}
                  {hasEscalation && (
                    <EscalationCard adminName="Alec" />
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* Streaming indicator — only when no text yet */}
          {isStreaming &&
            (messages.at(-1)?.role !== "assistant" ||
              !getTextFromParts(messages.at(-1)!)) && (
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
