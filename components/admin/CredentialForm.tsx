"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { FormField } from "./FormField";
import {
  PasswordStrength,
  calculatePasswordStrength,
} from "./PasswordStrength";
import { Toggle } from "./Toggle";

export type CredentialCategory =
  | "internet"
  | "mobile"
  | "streaming"
  | "smart_home"
  | "utilities"
  | "other";

export type HouseholdOption = {
  id: string;
  name: string;
};

export type CredentialInitial = {
  id: string;
  service_name: string;
  category: CredentialCategory;
  household_id: string | null;
  username: string | null;
  url: string | null;
  notes: string | null;
  is_shared: boolean;
};

export type CredentialBillingInitial = {
  monthly_cost: number | null;
  price_locked_until: string | null;
  last_negotiated_at: string | null;
  notes: string | null;
};

type CredentialFormProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: CredentialInitial | null;
  households: HouseholdOption[];
  /** When true, render the admin-only "Billing & Negotiation" section. */
  canManageBilling?: boolean;
  /** Existing billing row for the credential being edited. null = none yet. */
  initialBilling?: CredentialBillingInitial | null;
  /**
   * Existing admin-only private notes for this credential. null = no row yet
   * (or viewer can't read them). Only respected when `canManageBilling` is
   * true — non-admins never see the textarea.
   */
  initialAdminNotes?: string | null;
  onClose: () => void;
};

const CATEGORY_OPTIONS: { value: CredentialCategory; label: string }[] = [
  { value: "internet", label: "Internet" },
  { value: "mobile", label: "Mobile" },
  { value: "streaming", label: "Streaming" },
  { value: "smart_home", label: "Smart Home" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

// Sentinel value used in the household <select> for the
// "(shared across all households)" choice.
const SHARED_ALL = "__shared_all__";

type FormState = {
  service_name: string;
  category: CredentialCategory;
  householdSel: string; // household.id OR SHARED_ALL
  username: string;
  password: string;
  url: string;
  notes: string;
  shareWithHousehold: boolean;
  // Billing — admin-only. Strings so empty input is "no value"; parsed on save.
  billing_monthly_cost: string;
  billing_price_locked_until: string;
  billing_last_negotiated_at: string;
  billing_notes: string;
  // Admin-only private memory — never seen by the AI chat assistant.
  admin_notes: string;
};

function initialState(
  initial: CredentialInitial | null | undefined,
  billing: CredentialBillingInitial | null | undefined,
  adminNotes: string | null | undefined,
): FormState {
  if (!initial) {
    return {
      service_name: "",
      category: "other",
      householdSel: SHARED_ALL,
      username: "",
      password: "",
      url: "",
      notes: "",
      shareWithHousehold: true,
      billing_monthly_cost: "",
      billing_price_locked_until: "",
      billing_last_negotiated_at: "",
      billing_notes: "",
      admin_notes: "",
    };
  }
  return {
    service_name: initial.service_name,
    category: initial.category,
    householdSel: initial.household_id ?? SHARED_ALL,
    username: initial.username ?? "",
    password: "",
    url: initial.url ?? "",
    notes: initial.notes ?? "",
    shareWithHousehold: initial.is_shared,
    billing_monthly_cost:
      billing?.monthly_cost != null ? String(billing.monthly_cost) : "",
    billing_price_locked_until: billing?.price_locked_until ?? "",
    billing_last_negotiated_at: billing?.last_negotiated_at ?? "",
    billing_notes: billing?.notes ?? "",
    admin_notes: adminNotes ?? "",
  };
}

export function CredentialForm({
  open,
  mode,
  initial,
  households,
  canManageBilling = false,
  initialBilling,
  initialAdminNotes,
  onClose,
}: CredentialFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() =>
    initialState(initial, initialBilling, initialAdminNotes),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingOpen, setBillingOpen] = useState(false);
  const lastInitialIdRef = useRef<string | null>(initial?.id ?? null);

  // Reset state whenever the sheet opens or the edited row changes.
  useEffect(() => {
    if (!open) return;
    const incomingId = initial?.id ?? null;
    setState(initialState(initial, initialBilling, initialAdminNotes));
    setShowPassword(false);
    setPwFocused(false);
    setError(null);
    // Auto-expand the billing section when editing a credential that
    // already has a billing row — admins typically open the sheet to edit
    // billing, not the login.
    setBillingOpen(!!initialBilling);
    lastInitialIdRef.current = incomingId;
  }, [open, initial, initialBilling, initialAdminNotes]);

  const householdOptions = useMemo(() => {
    const opts = [
      { value: SHARED_ALL, label: "(shared across all households)" },
      ...households.map((h) => ({ value: h.id, label: h.name })),
    ];
    return opts;
  }, [households]);

  const isSharedAll = state.householdSel === SHARED_ALL;
  const pwStrength = calculatePasswordStrength(state.password);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }

  async function handleSubmit() {
    setError(null);

    // Validate
    if (!state.service_name.trim()) {
      setError("Service name is required");
      return;
    }
    if (mode === "create" && !state.password) {
      setError("Password is required");
      return;
    }

    const household_id = isSharedAll ? null : state.householdSel;
    // When household_id is null the entry is shared across all households,
    // so is_shared must be true. Otherwise, use the toggle value.
    const is_shared = isSharedAll ? true : state.shareWithHousehold;

    // Only send password_plaintext when the user typed one.
    const password_plaintext =
      state.password.length > 0 ? state.password : undefined;

    const body = {
      service_name: state.service_name.trim(),
      category: state.category,
      household_id,
      username: state.username.trim() || null,
      url: state.url.trim() || null,
      notes: state.notes.trim() || null,
      is_shared,
      ...(password_plaintext ? { password_plaintext } : {}),
      // Admin-only private memory. Only sent when the viewer can manage
      // billing; the API also gates this server-side.
      ...(canManageBilling ? { admin_notes: state.admin_notes } : {}),
    };

    setSaving(true);
    try {
      const url =
        mode === "edit" && initial
          ? `/api/admin/credentials?id=${encodeURIComponent(initial.id)}`
          : "/api/admin/credentials";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: string; id?: string }
          | null;
        setError(json?.error ?? "Could not save credential");
        return;
      }

      // ─── Billing save (admin only, edit mode for now) ─────────────────
      // Two-stage save keeps the credential POST route simple. On create
      // mode we don't have the new credential id back yet — billing waits
      // until the next edit. That keeps the common "Alec just adds a
      // login" path one round-trip.
      if (canManageBilling && mode === "edit" && initial) {
        const hasAnyBilling =
          state.billing_monthly_cost.trim() !== "" ||
          state.billing_price_locked_until !== "" ||
          state.billing_last_negotiated_at !== "" ||
          state.billing_notes.trim() !== "";

        if (hasAnyBilling) {
          const parsedCost = state.billing_monthly_cost.trim()
            ? Number(state.billing_monthly_cost)
            : null;
          if (
            parsedCost !== null &&
            (Number.isNaN(parsedCost) || parsedCost < 0)
          ) {
            setError("Monthly cost must be a positive number");
            return;
          }
          const billingRes = await fetch(
            `/api/admin/credentials/${encodeURIComponent(initial.id)}/billing`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                monthly_cost: parsedCost,
                price_locked_until: state.billing_price_locked_until || null,
                last_negotiated_at: state.billing_last_negotiated_at || null,
                notes: state.billing_notes.trim() || null,
              }),
            },
          );
          if (!billingRes.ok) {
            const json = (await billingRes.json().catch(() => null)) as
              | { error?: string }
              | null;
            setError(json?.error ?? "Saved login but billing failed");
            return;
          }
        } else if (initialBilling) {
          // All billing fields cleared on an existing row — clear it.
          await fetch(
            `/api/admin/credentials/${encodeURIComponent(initial.id)}/billing`,
            { method: "DELETE" },
          );
        }
      }

      router.refresh();
      onClose();
    } catch {
      setError("Network error — could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "Edit credential" : "New credential"}
    >
      {/* Dimmed underlay */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Sheet panel */}
      <div
        className="absolute right-0 left-0 bottom-0 flex flex-col bg-surface-elevated border-t border-border md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:w-[440px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px]"
        style={{
          top: 60,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-[38px] rounded-full bg-border-strong" />
        </div>

        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="font-sans text-[14px] text-text-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <h2
            className="m-0 font-display font-semibold text-text"
            style={{ fontSize: 20, letterSpacing: "0.01em" }}
          >
            {mode === "edit" ? "Edit Credential" : "New Credential"}
          </h2>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="font-sans font-semibold text-accent disabled:opacity-50"
            style={{ fontSize: 14 }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-auto px-5 pt-4 pb-8">
          <FormField
            name="service_name"
            label="Service Name"
            value={state.service_name}
            onChange={(v) => set("service_name", v)}
            required
            placeholder="Netflix"
          />

          <FormField
            name="category"
            label="Category"
            select
            value={state.category}
            options={CATEGORY_OPTIONS}
            onChange={(v) => set("category", v as CredentialCategory)}
          />

          <FormField
            name="household"
            label="Household"
            select
            value={state.householdSel}
            options={householdOptions}
            onChange={(v) => set("householdSel", v)}
          />

          <FormField
            name="username"
            label="Username"
            mono
            value={state.username}
            onChange={(v) => set("username", v)}
            placeholder="email@example.com"
          />

          <FormField
            name="password"
            label="Password"
            mono
            focused={pwFocused}
            type={showPassword ? "text" : "password"}
            value={state.password}
            placeholder={
              mode === "edit" ? "Leave blank to keep current" : "ember-9-quiet-room"
            }
            required={mode === "create"}
            onChange={(v) => {
              set("password", v);
              setPwFocused(v.length > 0);
            }}
            trailing={
              <div className="flex items-center gap-2">
                <PasswordStrength level={pwStrength} />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="flex items-center justify-center rounded p-1"
                >
                  <EyeIcon open={showPassword} c="var(--color-text-2)" />
                </button>
              </div>
            }
          />

          <FormField
            name="url"
            label="URL"
            small
            value={state.url}
            onChange={(v) => set("url", v)}
            placeholder="example.com"
            type="url"
          />

          <FormField
            name="notes"
            label="Notes"
            multiline
            value={state.notes}
            onChange={(v) => set("notes", v)}
            placeholder="Any extra detail…"
          />

          {/* Admin-only private memory. Visually mirrors the regular Notes
              field via FormField, then a caption underneath makes the
              audience explicit. */}
          {canManageBilling && (
            <div>
              <FormField
                name="admin_notes"
                label="Admin notes"
                multiline
                value={state.admin_notes}
                onChange={(v) => set("admin_notes", v)}
                placeholder='e.g. "Comcast rep was rude last time, ask for retention."'
              />
              <p
                className="-mt-2 mb-3.5 font-sans text-text-3"
                style={{ fontSize: 11 }}
              >
                Private — never shared with the chat assistant.
              </p>
            </div>
          )}

          {/* Share with household — only when a specific household is selected */}
          {!isSharedAll && (
            <div
              className={cn(
                "mt-3 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-bg",
              )}
              style={{ padding: "12px 14px" }}
            >
              <div>
                <div className="font-sans text-[14px] font-medium text-text">
                  Share with household
                </div>
                <div className="mt-[2px] font-sans text-[12px] text-text-2">
                  Visible to all members of this household.
                </div>
              </div>
              <Toggle
                on={state.shareWithHousehold}
                onChange={(v) => set("shareWithHousehold", v)}
                ariaLabel="Share with household"
              />
            </div>
          )}

          {/* Billing & Negotiation — admin-only. Hidden in create mode
              because we need the new credential's id before we can write a
              billing row; users edit the credential after creation. */}
          {canManageBilling && mode === "edit" && (
            <details
              open={billingOpen}
              onToggle={(e) => setBillingOpen(e.currentTarget.open)}
              className="mt-4 rounded-[12px] border border-border bg-bg"
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 [&::-webkit-details-marker]:hidden"
              >
                <div>
                  <div className="font-sans text-[14px] font-medium text-text">
                    Billing &amp; Negotiation
                  </div>
                  <div className="mt-0.5 font-sans text-[12px] text-text-2">
                    Admin-only — members never see these fields.
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={cn(
                    "text-text-3 transition-transform",
                    billingOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>

              <div className="border-t border-border px-3.5 pb-3.5 pt-3">
                <FormField
                  name="billing_monthly_cost"
                  label="Monthly cost ($)"
                  value={state.billing_monthly_cost}
                  onChange={(v) => set("billing_monthly_cost", v)}
                  placeholder="79.99"
                  mono
                  type="number"
                />

                <FormField
                  name="billing_price_locked_until"
                  label="Price locked through"
                  value={state.billing_price_locked_until}
                  onChange={(v) => set("billing_price_locked_until", v)}
                  type="date"
                  small
                />

                <FormField
                  name="billing_last_negotiated_at"
                  label="Last negotiated"
                  value={state.billing_last_negotiated_at}
                  onChange={(v) => set("billing_last_negotiated_at", v)}
                  type="date"
                  small
                />

                <FormField
                  name="billing_notes"
                  label="Negotiation notes"
                  multiline
                  value={state.billing_notes}
                  onChange={(v) => set("billing_notes", v)}
                  placeholder='e.g. "Spoke to retention. Mentioned Frontier $55 offer. Got back to $79."'
                />
              </div>
            </details>
          )}

          {error && (
            <p className="mt-4 font-sans text-[13px] text-[#C77575]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
