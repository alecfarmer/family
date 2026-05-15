"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { LoginState } from "./types";

const emailSchema = z.string().email("Please enter a valid email address.");
// Supabase's OTP_LENGTH is configurable per project (default 6, this project
// is set to 8). Accept any 4–12 digit code — Supabase itself validates length
// against what it generated, so we only need to filter non-numeric junk.
const codeSchema = z
  .string()
  .regex(/^\d{4,12}$/, "Enter the digits from your email.");

/** Step 1 — email submitted, request OTP. */
export async function requestOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { step: "email", email: raw, error: parsed.error.issues[0]?.message };
  }

  const sb = await createSupabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email: parsed.data,
    // Only pre-approved family members can sign in. inviteUserByEmail on
    // /admin/users creates the auth.users row for new invitees first.
    options: { shouldCreateUser: false },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate") || msg.includes("too many")) {
      return {
        step: "email",
        email: parsed.data,
        error: "Too many attempts. Wait a minute and try again.",
      };
    }
    if (msg.includes("not allowed") || msg.includes("signups not allowed")) {
      return {
        step: "email",
        email: parsed.data,
        error:
          "That email isn't on the family list yet. Ask Alec to invite you.",
      };
    }
    return { step: "email", email: parsed.data, error: error.message };
  }

  return { step: "code", email: parsed.data, sentAt: Date.now() };
}

/** Step 2 — code entered, verify and create session. */
export async function verifyOtp(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email =
    formData.get("email")?.toString().trim().toLowerCase() ?? prev.email ?? "";
  const code = formData.get("code")?.toString().trim() ?? "";

  const emailParsed = emailSchema.safeParse(email);
  if (!emailParsed.success) {
    return { step: "email", error: "Please start over." };
  }

  const codeParsed = codeSchema.safeParse(code);
  if (!codeParsed.success) {
    return {
      step: "code",
      email: emailParsed.data,
      error: codeParsed.error.issues[0]?.message,
    };
  }

  const sb = await createSupabaseServer();
  const { data, error } = await sb.auth.verifyOtp({
    email: emailParsed.data,
    token: codeParsed.data,
    type: "email",
  });

  if (error || !data.session) {
    return {
      step: "code",
      email: emailParsed.data,
      error: "Code is wrong or has expired. Try a fresh one.",
    };
  }

  // Cookies set by the Supabase client are attached to the action's response.
  // Next.js carries them through to the redirect — the (member) layout will
  // read the session and serve the chat home.
  redirect("/");
}
