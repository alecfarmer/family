"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkState } from "./actions";
import { cn } from "@/components/ui/cn";

const initialState: SendMagicLinkState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initialState);

  return (
    <form action={action}>
      {/* Card */}
      <div
        className="rounded-[20px] border border-border bg-surface p-7"
        style={{
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(200,121,65,0.15)",
        }}
      >
        <h1
          className="mb-2 text-center font-display font-semibold text-text"
          style={{ fontSize: 30, letterSpacing: "0.01em" }}
        >
          Welcome to Family
        </h1>
        <p
          className="mb-[22px] text-center font-sans text-text-2"
          style={{ fontSize: 14, lineHeight: 1.5 }}
        >
          Enter your email to receive a secure sign-in link.
        </p>

        {/* Email label */}
        <div
          className="mb-1.5 font-sans font-medium uppercase text-text-3"
          style={{ fontSize: 11, letterSpacing: "0.12em" }}
        >
          Email
        </div>

        {/* Email input */}
        <input
          name="email"
          type="email"
          placeholder="you@home.com"
          autoComplete="email"
          required
          disabled={state.sent || pending}
          className={cn(
            "mb-[18px] w-full rounded-[12px] border bg-surface-elevated px-[14px] py-3 font-sans text-text outline-none transition-shadow",
            "placeholder:text-text-3",
            "focus:border-accent focus:shadow-[0_0_0_3px_rgba(200,121,65,0.15)]",
            "disabled:opacity-60",
          )}
          style={{ fontSize: 15 }}
        />

        {/* Send Link button */}
        <button
          type="submit"
          disabled={state.sent || pending}
          className="w-full rounded-full bg-accent py-[14px] px-5 font-sans font-semibold text-bg transition-opacity disabled:opacity-60"
          style={{
            fontSize: 15,
            letterSpacing: "0.02em",
            boxShadow: "0 0 24px rgba(200,121,65,0.15)",
          }}
        >
          {pending ? "Sending…" : "Send Link"}
        </button>

        {/* Feedback */}
        {state.sent && (
          <p
            className="mt-4 text-center font-sans text-success"
            style={{ fontSize: 13.5 }}
          >
            Link sent! Check your email.
          </p>
        )}
        {state.error && (
          <p
            className="mt-4 text-center font-sans text-destructive"
            style={{ fontSize: 13.5 }}
          >
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
