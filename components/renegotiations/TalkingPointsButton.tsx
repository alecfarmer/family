"use client";

import { useState } from "react";

type Result = {
  service: string;
  script: string;
  generatedAt: string;
};

/**
 * Tap → fetch Claude-generated talking points for the renegotiation call.
 * Renders the result inline below the button so admins can read while
 * they're on the phone with retention. State stays local — re-tap
 * generates fresh points.
 */
export function TalkingPointsButton({ credentialId }: { credentialId: string }) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "result"; data: Result }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function generate() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/admin/credentials/${encodeURIComponent(credentialId)}/talking-points`,
        { method: "POST" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setState({
          kind: "error",
          message: json?.error ?? "Could not generate talking points",
        });
        return;
      }
      const data = (await res.json()) as Result;
      setState({ kind: "result", data });
    } catch {
      setState({ kind: "error", message: "Network error" });
    }
  }

  if (state.kind === "result") {
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent">
            Call script · {state.data.service}
          </span>
          <button
            type="button"
            onClick={() => void generate()}
            className="font-sans text-[11.5px] text-text-3 hover:text-text-2"
          >
            Regenerate
          </button>
        </div>
        <pre
          className="whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 font-sans text-[13px] leading-[1.5] text-text"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {state.data.script}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => void generate()}
        disabled={state.kind === "loading"}
        className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 font-sans text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:opacity-60"
      >
        {state.kind === "loading"
          ? "Drafting call script…"
          : "Get talking points"}
      </button>
      {state.kind === "error" && (
        <span className="font-sans text-[11px] text-[#C77575]">
          {state.message}
        </span>
      )}
    </div>
  );
}
