import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

// Service-role client — bypasses RLS. NEVER import from client code or
// expose anything derived from it (rows, errors, etc.) to a browser response
// without explicit access checks.
export const supabaseService = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
