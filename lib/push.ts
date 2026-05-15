import "server-only";
import webpush, { type WebPushError } from "web-push";
import { env } from "@/lib/env";
import { supabaseService } from "@/lib/supabase/service";

let vapidConfigured = false;
function configureVapid(): void {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    `mailto:${env.VAPID_EMAIL}`,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function notifyAdmins(payload: PushPayload): Promise<void> {
  configureVapid();
  // Two-query approach — robust against missing generated FK join types.
  const { data: admins } = await supabaseService
    .from("users")
    .select("id")
    .eq("role", "admin");

  if (!admins?.length) return;

  const adminIds = admins.map((a) => a.id);

  const { data: subs } = await supabaseService
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", adminIds);

  if (!subs?.length) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url }),
      ),
    ),
  );

  // Collect stale subscription IDs (410 Gone or 404 Not Found).
  const staleIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as WebPushError;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        staleIds.push(subs[i].id);
      } else {
        // Surface unexpected errors — misconfigured VAPID, network failures, etc.
        console.error("[push] sendNotification failed:", err?.message ?? err);
      }
    }
  });

  if (staleIds.length) {
    await supabaseService
      .from("push_subscriptions")
      .delete()
      .in("id", staleIds);
  }
}

export async function notifyAlecOfHelpRequest({
  requestId,
  question,
  userName,
  householdName,
}: {
  requestId: string;
  question: string;
  userName: string;
  householdName?: string;
}): Promise<void> {
  const suffix = householdName ? ` (${householdName})` : "";
  const body =
    question.length > 140 ? `${question.slice(0, 137)}...` : question;
  await notifyAdmins({
    title: `${userName}${suffix} needs help`,
    body,
    url: `/admin/help-requests?focus=${requestId}`,
  });
}

export async function notifyAlecOfFirstLogin({
  userName,
}: {
  userName: string;
}): Promise<void> {
  await notifyAdmins({
    title: "New family member online",
    body: `${userName} just logged in for the first time.`,
    url: "/admin/users",
  });
}
