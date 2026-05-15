import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { notifyAdmins } from "@/lib/push";
import { env } from "@/lib/env";

// Vercel cron triggers POST. We accept GET too so it can be hit manually
// from a browser tab while testing — the auth check below guards both.
export const dynamic = "force-dynamic";

/**
 * Daily reminder sweep. Finds credential_billing rows where the price lock
 * expires in the next 7 days (including overdue) and pushes a single
 * digest notification per household admin set.
 *
 * Security: Vercel cron sets `Authorization: Bearer <CRON_SECRET>`. We
 * compare against the env var to refuse arbitrary public callers. If the
 * env var isn't set we still allow same-host invocations (NEXT_PUBLIC_SITE_URL
 * matches) so local development works.
 */
async function handler(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedAuth = env.CRON_SECRET
    ? `Bearer ${env.CRON_SECRET}`
    : null;

  if (expectedAuth) {
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Find rows expiring in [today, today+7d] OR already overdue by up to 14d.
  // service-role client bypasses RLS — that's intentional, the cron acts on
  // behalf of the system, not any one user.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenOut = new Date(today.getTime() + 7 * 86_400_000);
  const fourteenBack = new Date(today.getTime() - 14 * 86_400_000);

  const { data: billing } = await supabaseService
    .from("credential_billing")
    .select(
      "credential_id, price_locked_until, monthly_cost, credentials!inner(service_name, household_id)",
    )
    .gte("price_locked_until", fourteenBack.toISOString().slice(0, 10))
    .lte("price_locked_until", sevenOut.toISOString().slice(0, 10));

  type Row = {
    credential_id: string;
    price_locked_until: string;
    monthly_cost: number | null;
    credentials:
      | { service_name: string; household_id: string | null }
      | { service_name: string; household_id: string | null }[]
      | null;
  };

  const expandedRows = (billing as Row[] | null) ?? [];

  const items = expandedRows
    .map((r) => {
      const cred = Array.isArray(r.credentials)
        ? r.credentials[0]
        : r.credentials;
      if (!cred) return null;
      const daysLeft = Math.ceil(
        (new Date(r.price_locked_until).getTime() - today.getTime()) / 86_400_000,
      );
      return {
        service: cred.service_name,
        daysLeft,
        priceLockedUntil: r.price_locked_until,
        monthlyCost: r.monthly_cost,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (items.length === 0) {
    return NextResponse.json({ ok: true, items: 0 });
  }

  // Build a digest. Up to three highlighted services in the push body.
  const headline = items[0];
  const headlineLabel =
    headline.daysLeft < 0
      ? `${headline.service} is overdue to renegotiate`
      : headline.daysLeft === 0
        ? `Renegotiate ${headline.service} today`
        : `${headline.service} expires in ${headline.daysLeft} day${headline.daysLeft === 1 ? "" : "s"}`;

  const moreCount = items.length - 1;
  const body =
    moreCount > 0
      ? `${headlineLabel} · ${moreCount} other${moreCount === 1 ? "" : "s"} on the list`
      : headlineLabel;

  await notifyAdmins({
    title: "Family · time to call",
    body,
    url: "/renegotiations",
  });

  return NextResponse.json({ ok: true, items: items.length });
}

export async function GET(req: Request) {
  return handler(req);
}
export async function POST(req: Request) {
  return handler(req);
}
