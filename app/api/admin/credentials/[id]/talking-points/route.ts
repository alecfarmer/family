import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createSupabaseServer } from "@/lib/supabase/server";
import { canManageBillingFor } from "@/lib/billing";
import { logAccess } from "@/lib/accessLog";

export const maxDuration = 30;

const SYSTEM = [
  "You write practical, friendly call scripts for a household admin who is",
  "about to phone their internet / mobile / streaming provider to negotiate",
  "or renegotiate the locked price they pay.",
  "",
  "Output format — plain text only, no Markdown, no bullets (the UI renders",
  "the text literally). Keep it under 200 words. Structure:",
  "  1. One opening line they can read to the retention rep.",
  "  2. The numbers they need at hand (current price, lock end date, last",
  "     negotiated price if known).",
  '  3. 2–3 leverage points appropriate to this provider (e.g. "mention',
  "     Frontier $55 promo if Spectrum\", \"AT&T retention will often match",
  "     the loyalty rate if you ask for 'cancellations' instead of",
  "     'retention'\").",
  "  4. A concrete walkaway price to aim for.",
  "  5. A reminder to ask the rep to confirm the new lock end date and email",
  "     a written confirmation.",
  "",
  "Be specific to the named service. Don't invent customer-specific facts —",
  "only use the data given. If the service is unfamiliar, fall back to",
  "general retention-call advice.",
].join("\n");

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const allowed = await canManageBillingFor(id);
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sb = await createSupabaseServer();
  const [{ data: cred }, { data: billing }] = await Promise.all([
    sb
      .from("credentials")
      .select("id, service_name, category, household_id, notes")
      .eq("id", id)
      .single(),
    sb
      .from("credential_billing")
      .select(
        "monthly_cost, price_locked_until, last_negotiated_at, notes",
      )
      .eq("credential_id", id)
      .maybeSingle(),
  ]);

  if (!cred) {
    return NextResponse.json({ error: "credential_not_found" }, { status: 404 });
  }

  // Hand the model the facts in a compact key:value block. Anything we
  // don't know is omitted; we never want the model to invent it.
  const facts: string[] = [`Service: ${cred.service_name}`, `Category: ${cred.category}`];
  if (billing?.monthly_cost != null) {
    facts.push(`Current locked price: $${Number(billing.monthly_cost).toFixed(2)}/mo`);
  }
  if (billing?.price_locked_until) {
    facts.push(`Lock expires: ${billing.price_locked_until}`);
  }
  if (billing?.last_negotiated_at) {
    facts.push(`Last call: ${billing.last_negotiated_at}`);
  }
  if (billing?.notes) {
    facts.push(`Previous negotiation notes: ${billing.notes}`);
  }
  if (cred.notes) {
    facts.push(`Account notes: ${cred.notes}`);
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM,
      prompt: [
        "Draft a renegotiation call script using the facts below.",
        "",
        facts.join("\n"),
      ].join("\n"),
    });

    await logAccess({
      action: "admin_billing_script_generated",
      resourceId: id,
      resourceType: "credential",
      metadata: { service: cred.service_name },
    });

    return NextResponse.json({
      service: cred.service_name,
      script: text.trim(),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "script_failed";
    return NextResponse.json(
      { error: "script_failed", detail: message },
      { status: 502 },
    );
  }
}
