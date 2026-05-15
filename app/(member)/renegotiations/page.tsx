import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canManageBilling, daysUntilLockExpires } from "@/lib/billing";
import { getUserHouseholds } from "@/lib/household";
import { TalkingPointsButton } from "@/components/renegotiations/TalkingPointsButton";

type Cred = {
  id: string;
  service_name: string;
  household_id: string | null;
  household_name: string | null;
  category: string;
  is_shared: boolean;
};

type BillingRow = {
  credential_id: string;
  monthly_cost: number | null;
  price_locked_until: string | null;
  last_negotiated_at: string | null;
  notes: string | null;
};

type Row = {
  credential: Cred;
  billing: BillingRow;
  daysLeft: number;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMoney(amount: number | null): string {
  if (amount == null) return "—";
  return `$${amount.toFixed(2)}`;
}

function urgencyLabel(days: number): { tone: string; label: string } {
  if (days < 0) return { tone: "danger", label: `${-days}d overdue` };
  if (days === 0) return { tone: "danger", label: "Today" };
  if (days <= 7) return { tone: "warning", label: `${days}d` };
  if (days <= 30) return { tone: "warning", label: `${days}d` };
  return { tone: "neutral", label: `${days}d` };
}

export default async function RenegotiationsPage() {
  const { profile, sb } = await requireUser();
  const billingAllowed = await canManageBilling();
  // Members never see this page at all — keep it a 404 rather than a
  // redirect so it doesn't leak the route's existence to a member.
  if (!billingAllowed) notFound();

  const isAdmin = profile.role === "admin";

  // RLS already filters credential_billing to what the user can see, but
  // we have to do a small dance to attach service names + households.
  const [billingRes, households] = await Promise.all([
    sb
      .from("credential_billing")
      .select(
        "credential_id, monthly_cost, price_locked_until, last_negotiated_at, notes",
      ),
    isAdmin
      ? sb.from("households").select("id, name").order("name").then((r) => r.data ?? [])
      : getUserHouseholds(profile.id),
  ]);
  const billingRows = (billingRes.data ?? []) as BillingRow[];
  if (billingRows.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader />
        <EmptyState />
      </div>
    );
  }

  const credIds = billingRows.map((b) => b.credential_id);
  const credsRes = await sb
    .from("credentials")
    .select("id, service_name, household_id, category, is_shared")
    .in("id", credIds);

  const householdNameById = new Map(households.map((h) => [h.id, h.name]));
  const credById = new Map<string, Cred>(
    (credsRes.data ?? []).map((c) => [
      c.id,
      {
        id: c.id,
        service_name: c.service_name,
        household_id: c.household_id,
        household_name: c.household_id
          ? (householdNameById.get(c.household_id) ?? null)
          : null,
        category: c.category,
        is_shared: c.is_shared,
      },
    ]),
  );

  const rows: Row[] = billingRows
    .filter((b) => b.price_locked_until !== null)
    .map((b) => {
      const cred = credById.get(b.credential_id);
      if (!cred) return null;
      const days = daysUntilLockExpires(b.price_locked_until);
      if (days === null) return null;
      return { credential: cred, billing: b, daysLeft: days };
    })
    .filter((r): r is Row => r !== null)
    // Most-urgent first — already-expired at the top, then ascending days.
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const overdue = rows.filter((r) => r.daysLeft < 0);
  const soon = rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30);
  const later = rows.filter((r) => r.daysLeft > 30);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <PageHeader />
      <div className="flex flex-col gap-4 px-4 pb-8">
        {overdue.length > 0 && (
          <RowGroup title="Overdue" tone="danger">
            {overdue.map((r) => (
              <RowItem key={r.credential.id} row={r} />
            ))}
          </RowGroup>
        )}
        {soon.length > 0 && (
          <RowGroup title="Coming up" tone="warning">
            {soon.map((r) => (
              <RowItem key={r.credential.id} row={r} />
            ))}
          </RowGroup>
        )}
        {later.length > 0 && (
          <RowGroup title="Locked for now" tone="neutral">
            {later.map((r) => (
              <RowItem key={r.credential.id} row={r} />
            ))}
          </RowGroup>
        )}
        {rows.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex-shrink-0 bg-bg px-5 pb-3.5 pt-6">
      <h1
        className="font-display font-semibold text-text"
        style={{ fontSize: 34, letterSpacing: "0.01em" }}
      >
        Renegotiations
      </h1>
      <p className="mt-0.5 font-sans text-[13.5px] text-text-2">
        Track when locked prices expire so the bill doesn&apos;t creep up.
      </p>
    </div>
  );
}

function RowGroup({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "danger" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const dot =
    tone === "danger"
      ? "#C77575"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-text-3)";
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot }}
        />
        <span
          className="font-sans font-semibold uppercase tracking-[0.14em] text-text-3"
          style={{ fontSize: 10.5 }}
        >
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function RowItem({ row }: { row: Row }) {
  const { credential, billing, daysLeft } = row;
  const urgency = urgencyLabel(daysLeft);
  return (
    <div
      className="rounded-[14px] border border-border bg-surface p-3.5"
      style={
        daysLeft < 0
          ? { borderLeft: `3px solid #C77575` }
          : daysLeft <= 14
            ? { borderLeft: "3px solid var(--color-warning)" }
            : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-display font-semibold text-text"
              style={{ fontSize: 18 }}
            >
              {credential.service_name}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.06em]"
              style={
                urgency.tone === "danger"
                  ? {
                      color: "#C77575",
                      borderColor: "rgba(143,74,74,0.4)",
                      background: "rgba(143,74,74,0.14)",
                    }
                  : urgency.tone === "warning"
                    ? {
                        color: "var(--color-warning)",
                        borderColor: "rgba(184,131,42,0.4)",
                        background: "rgba(184,131,42,0.12)",
                      }
                    : {
                        color: "var(--color-text-2)",
                        borderColor: "var(--color-border)",
                        background: "var(--color-surface-elevated)",
                      }
              }
            >
              {urgency.label}
            </span>
          </div>
          <div className="mt-1 font-sans text-[12.5px] text-text-3">
            {credential.is_shared || !credential.household_name
              ? "Shared family"
              : credential.household_name}
            {" · "}
            <span className="font-mono">{fmtMoney(billing.monthly_cost)}/mo</span>
            {billing.last_negotiated_at && (
              <>
                {" · "}last call {fmtDate(billing.last_negotiated_at)}
              </>
            )}
          </div>
          <div className="mt-1.5 font-sans text-[13px] text-text-2">
            {daysLeft < 0
              ? `Locked price expired ${fmtDate(billing.price_locked_until!)}.`
              : `Locked through ${fmtDate(billing.price_locked_until!)}.`}
          </div>
          {billing.notes && (
            <div className="mt-2 rounded-md bg-bg p-2.5 font-sans text-[12.5px] italic text-text-2">
              {billing.notes}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <TalkingPointsButton credentialId={credential.id} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <svg
        width="42"
        height="42"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2"
          stroke="var(--color-text-3)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4.5" stroke="var(--color-text-3)" strokeWidth="1.4" />
      </svg>
      <p className="mt-3 font-sans text-[14px] text-text-2">
        Nothing locked yet.
      </p>
      <p className="mt-1 max-w-xs font-sans text-[12.5px] text-text-3">
        Open a credential in the Vault, expand “Billing &amp; Negotiation,” and
        set the date your locked price expires. We&apos;ll surface it here and
        push you a week before.
      </p>
    </div>
  );
}
