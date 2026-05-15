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

type CredentialFormProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: CredentialInitial | null;
  households: HouseholdOption[];
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
};

function initialState(initial: CredentialInitial | null | undefined): FormState {
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
  };
}

export function CredentialForm({
  open,
  mode,
  initial,
  households,
  onClose,
}: CredentialFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [showPassword, setShowPassword] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastInitialIdRef = useRef<string | null>(initial?.id ?? null);

  // Reset state whenever the sheet opens or the edited row changes.
  useEffect(() => {
    if (!open) return;
    const incomingId = initial?.id ?? null;
    setState(initialState(initial));
    setShowPassword(false);
    setPwFocused(false);
    setError(null);
    lastInitialIdRef.current = incomingId;
  }, [open, initial]);

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
          | { error?: string }
          | null;
        setError(json?.error ?? "Could not save credential");
        return;
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

          {error && (
            <p className="mt-4 font-sans text-[13px] text-[#C77575]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
