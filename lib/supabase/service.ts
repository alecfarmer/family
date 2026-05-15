import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

// Service-role client — bypasses RLS. NEVER import from client code or
// expose anything derived from it (rows, errors, etc.) to a browser response
// without explicit access checks.
//
// Initialized lazily so `next build` doesn't read env vars at module load time.
let _client: SupabaseClient<Database> | null = null;

function getServiceClient(): SupabaseClient<Database> {
  if (_client) return _client;
  _client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return _client;
}

// Proxy preserves the `supabaseService.from(...)` ergonomics callers expect,
// while deferring the actual createClient call until first use.
export const supabaseService = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop: string) {
    return getServiceClient()[prop as keyof SupabaseClient<Database>];
  },
});
