"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const emailSchema = z.string().email("Please enter a valid email address.");

export type SendMagicLinkState = { sent?: true; error?: string };

export async function sendMagicLink(
  _prev: SendMagicLinkState,
  formData: FormData,
): Promise<SendMagicLinkState> {
  const raw = formData.get("email");
  const result = emailSchema.safeParse(raw);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid email." };
  }

  const sb = await createSupabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email: result.data,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { sent: true };
}
