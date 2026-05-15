import "server-only";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

/**
 * Server-side check: can the signed-in user manage the
 * credential_billing row for *any* credential? Used to decide whether to
 * render the billing form section, the renegotiation chip on the vault,
 * and the /renegotiations page. The DB-level RLS still enforces row-level
 * access — this is just a UI gate.
 *
 * True when:
 *   - users.role = 'admin' (app admin), OR
 *   - the user is a household_admin for at least one household.
 *
 * cache()-wrapped so the layout and child pages can both call it within
 * a single render without a duplicate query.
 */
export const canManageBilling = cache(async (): Promise<boolean> => {
  const { profile, sb } = await requireUser();
  if (profile.role === "admin") return true;

  const { data } = await sb
    .from("household_members")
    .select("id")
    .eq("user_id", profile.id)
    .eq("is_household_admin", true)
    .limit(1)
    .maybeSingle();

  return !!data;
});

/**
 * Tighter check: can the user manage billing for a specific credential?
 * Mirrors the SQL function can_admin_credential_billing(). Used by API
 * routes before they write.
 */
export async function canManageBillingFor(
  credentialId: string,
): Promise<boolean> {
  const { profile, sb } = await requireUser();
  if (profile.role === "admin") return true;

  // Find the credential's household, then check if the user is a
  // household_admin there. Credentials with household_id = null (shared)
  // are app-admin-only; the join below returns nothing for them.
  const { data: cred } = await sb
    .from("credentials")
    .select("household_id")
    .eq("id", credentialId)
    .maybeSingle();
  if (!cred?.household_id) return false;

  const { data } = await sb
    .from("household_members")
    .select("id")
    .eq("user_id", profile.id)
    .eq("household_id", cred.household_id)
    .eq("is_household_admin", true)
    .limit(1)
    .maybeSingle();

  return !!data;
}

/** Days until a price-lock expires (negative = already past). */
export function daysUntilLockExpires(
  priceLockedUntil: string | null,
): number | null {
  if (!priceLockedUntil) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lock = new Date(priceLockedUntil);
  const ms = lock.getTime() - today.getTime();
  return Math.ceil(ms / 86_400_000);
}

/**
 * "Urgency bucket" for the renegotiation chip / activity feed.
 *   - "expired" → past due, call ASAP
 *   - "soon"    → within 14 days (amber chip surfaces on /vault)
 *   - "later"   → more than 14 days out (no chip; visible on /renegotiations)
 *   - null      → no lock date on file
 */
export function lockUrgency(
  priceLockedUntil: string | null,
): "expired" | "soon" | "later" | null {
  const days = daysUntilLockExpires(priceLockedUntil);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= 14) return "soon";
  return "later";
}
