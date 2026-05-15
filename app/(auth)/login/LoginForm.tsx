"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestOtp, verifyOtp } from "./actions";
import { initialLoginState, type LoginState } from "./types";
import { cn } from "@/components/ui/cn";

const cardStyle = {
  boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(200,121,65,0.15)",
};

const labelStyle = { fontSize: 11, letterSpacing: "0.12em" };
const inputBase =
  "w-full rounded-[12px] border bg-surface-elevated px-[14px] py-3 font-sans text-text outline-none transition-shadow placeholder:text-text-3 focus:border-accent focus:shadow-[0_0_0_3px_rgba(200,121,65,0.15)] disabled:opacity-60";

export function LoginForm() {
  // Two server actions, one piece of state shared via React's useActionState pattern.
  // We expose both via separate hooks but route the user between them with `mode`.
  const [requestState, doRequest, requestPending] = useActionState<
    LoginState,
    FormData
  >(requestOtp, initialLoginState);
  const [verifyState, doVerify, verifyPending] = useActionState<
    LoginState,
    FormData
  >(verifyOtp, initialLoginState);

  // `mode` is the visible step. It's derived from whichever action ran most recently
  // and what it returned, with a manual "back to email" override.
  const [mode, setMode] = useState<"email" | "code">("email");
  const [resetSeed, setResetSeed] = useState(0); // forces input remount on reset

  // Whenever requestOtp succeeds, flip to the code step.
  useEffect(() => {
    if (requestState.step === "code" && requestState.email) {
      setMode("code");
    }
  }, [requestState]);

  // Whenever verifyOtp returns an error, stay on the code step; success calls
  // redirect() server-side, so the verifyState we observe means there was an error.
  useEffect(() => {
    if (verifyState.error) setMode("code");
  }, [verifyState]);

  // Active state for display: whichever action last touched the matching step.
  const state =
    mode === "code"
      ? verifyState.email || verifyState.error
        ? verifyState
        : requestState
      : requestState;
  const error = state.error;
  const email = requestState.email ?? verifyState.email ?? "";

  // ────────────────────────────────────────────────────────────────────
  // STEP 2 — code entry
  // ────────────────────────────────────────────────────────────────────
  if (mode === "code") {
    return (
      <CodeStep
        key={resetSeed}
        action={doVerify}
        pending={verifyPending}
        email={email}
        error={error}
        sentAt={requestState.sentAt}
        onUseDifferentEmail={() => {
          setMode("email");
          setResetSeed((n) => n + 1);
        }}
        onResend={doRequest}
        resendPending={requestPending}
      />
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // STEP 1 — email entry
  // ────────────────────────────────────────────────────────────────────
  return (
    <form action={doRequest}>
      <div className="rounded-[20px] border border-border bg-surface p-7" style={cardStyle}>
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
          Enter your email — we'll send you a 6-digit code.
        </p>

        <div className="mb-1.5 font-sans font-medium uppercase text-text-3" style={labelStyle}>
          Email
        </div>

        <input
          name="email"
          type="email"
          inputMode="email"
          placeholder="you@home.com"
          autoComplete="email"
          required
          defaultValue={email}
          disabled={requestPending}
          className={cn(inputBase, "mb-[18px]")}
          style={{ fontSize: 15 }}
        />

        <button
          type="submit"
          disabled={requestPending}
          className="w-full rounded-full bg-accent py-[14px] px-5 font-sans font-semibold text-bg transition-opacity disabled:opacity-60"
          style={{ fontSize: 15, letterSpacing: "0.02em", boxShadow: "0 0 24px rgba(200,121,65,0.15)" }}
        >
          {requestPending ? "Sending…" : "Send Code"}
        </button>

        {error && mode === "email" && (
          <p className="mt-4 text-center font-sans text-destructive" style={{ fontSize: 13.5 }}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Code step component — its own subtree so the input gets focused on entry
// ──────────────────────────────────────────────────────────────────────
function CodeStep(props: {
  action: (formData: FormData) => void;
  pending: boolean;
  email: string;
  error?: string;
  sentAt?: number;
  onUseDifferentEmail: () => void;
  onResend: (formData: FormData) => void;
  resendPending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    props.sentAt ? Math.max(0, 30 - Math.floor((Date.now() - props.sentAt) / 1000)) : 0,
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown to enable the resend button.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const resend = () => {
    if (secondsLeft > 0) return;
    const fd = new FormData();
    fd.set("email", props.email);
    props.onResend(fd);
    setSecondsLeft(30);
  };

  return (
    <form action={props.action}>
      <input type="hidden" name="email" value={props.email} />
      <div className="rounded-[20px] border border-border bg-surface p-7" style={cardStyle}>
        <h1
          className="mb-2 text-center font-display font-semibold text-text"
          style={{ fontSize: 30, letterSpacing: "0.01em" }}
        >
          Check your email
        </h1>
        <p
          className="mb-[22px] text-center font-sans text-text-2"
          style={{ fontSize: 14, lineHeight: 1.5 }}
        >
          We sent a 6-digit code to{" "}
          <span className="text-text">{props.email}</span>. Enter it below.
        </p>

        <div className="mb-1.5 font-sans font-medium uppercase text-text-3" style={labelStyle}>
          Code
        </div>

        <input
          ref={inputRef}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          required
          disabled={props.pending}
          className={cn(
            inputBase,
            "mb-[18px] text-center font-mono tracking-[0.5em]",
          )}
          style={{ fontSize: 22 }}
        />

        <button
          type="submit"
          disabled={props.pending}
          className="w-full rounded-full bg-accent py-[14px] px-5 font-sans font-semibold text-bg transition-opacity disabled:opacity-60"
          style={{ fontSize: 15, letterSpacing: "0.02em", boxShadow: "0 0 24px rgba(200,121,65,0.15)" }}
        >
          {props.pending ? "Signing you in…" : "Sign In"}
        </button>

        {props.error && (
          <p className="mt-4 text-center font-sans text-destructive" style={{ fontSize: 13.5 }}>
            {props.error}
          </p>
        )}

        <div
          className="mt-5 flex items-center justify-between font-sans text-text-3"
          style={{ fontSize: 12.5 }}
        >
          <button
            type="button"
            onClick={props.onUseDifferentEmail}
            className="underline-offset-2 hover:text-text-2 hover:underline"
          >
            Use a different email
          </button>
          <button
            type="button"
            disabled={secondsLeft > 0 || props.resendPending}
            onClick={resend}
            className="underline-offset-2 hover:text-text-2 hover:underline disabled:opacity-50 disabled:hover:no-underline"
          >
            {props.resendPending
              ? "Sending…"
              : secondsLeft > 0
                ? `Resend in ${secondsLeft}s`
                : "Resend code"}
          </button>
        </div>
      </div>
    </form>
  );
}
