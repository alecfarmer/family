import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY required — 32 random bytes base64-encoded"),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_EMAIL: z.string().email(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  ADMIN_DISPLAY_NAME: z.string().default("Alec"),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function read(): Env {
  if (cached) return cached;
  cached = schema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_EMAIL: process.env.VAPID_EMAIL,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    ADMIN_DISPLAY_NAME: process.env.ADMIN_DISPLAY_NAME,
  });
  return cached;
}

// Lazy proxy — env vars are only parsed when first accessed at request time,
// so `next build` succeeds even if some secrets aren't present in CI.
export const env = new Proxy({} as Env, {
  get(_, key: string) {
    return read()[key as keyof Env];
  },
});
