import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

/**
 * Insert an access_log row under the current user's auth context.
 * RLS allows inserts where `auth.uid() = user_id`. No-op when no user is
 * present (defensive — should not happen in protected routes).
 */
export async function logAccess(opts: {
  action: string;
  resourceId?: string;
  resourceType?: string;
  householdId?: string;
  metadata?: Json;
}): Promise<void> {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("access_log").insert({
    user_id: user.id,
    action: opts.action,
    resource_id: opts.resourceId ?? null,
    resource_type: opts.resourceType ?? null,
    household_id: opts.householdId ?? null,
    metadata: opts.metadata ?? null,
  });
}
