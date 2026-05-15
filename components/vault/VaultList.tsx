"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryPills } from "./CategoryPills";
import { CredentialRow, type CredentialRowData } from "./CredentialRow";
import {
  CredentialForm,
  type CredentialBillingInitial,
  type CredentialInitial,
  type HouseholdOption,
} from "@/components/admin/CredentialForm";

export type VaultCredential = CredentialRowData & {
  category: string;
  household_id: string | null;
  household_name: string | null;
  url: string | null;
  notes: string | null;
  /** Admin-only — undefined for non-admin viewers (server strips). */
  billing?: CredentialBillingInitial | null;
};

type VaultListProps = {
  credentials: VaultCredential[];
  categories: string[];
  /** When true, render add/edit/delete affordances. */
  isAdmin?: boolean;
  /** Passed to the credential form's household select. */
  households?: HouseholdOption[];
  /** Currently-active household scope from the global switcher. */
  scopedHousehold?: { id: string; name: string } | null;
  /** True when the user belongs to ≥2 households (drives chip display). */
  multiHousehold?: boolean;
  /** True when the viewer can edit billing — app admin OR household admin. */
  canManageBilling?: boolean;
};

export function VaultList({
  credentials,
  categories,
  isAdmin = false,
  households = [],
  scopedHousehold = null,
  multiHousehold = false,
  canManageBilling = false,
}: VaultListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("All");

  const [sheet, setSheet] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | {
        open: true;
        mode: "edit";
        initial: CredentialInitial;
        billing: CredentialBillingInitial | null;
      }
  >({ open: false });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered =
    selected === "All"
      ? credentials
      : credentials.filter((c) => c.category === selected);

  function openCreate() {
    setSheet({ open: true, mode: "create" });
  }
  function openEdit(c: VaultCredential) {
    setSheet({
      open: true,
      mode: "edit",
      initial: {
        id: c.id,
        service_name: c.service_name,
        category: c.category as CredentialInitial["category"],
        household_id: c.household_id,
        username: c.username,
        url: c.url,
        notes: c.notes,
        is_shared: c.is_shared,
      },
      billing: c.billing ?? null,
    });
  }
  function closeSheet() {
    setSheet({ open: false });
  }

  async function handleDelete(c: VaultCredential) {
    if (deletingId) return;
    const ok = window.confirm(
      `Delete the credential "${c.service_name}"? This cannot be undone.`,
    );
    if (!ok) return;
    setDeletingId(c.id);
    try {
      const res = await fetch(
        `/api/admin/credentials?id=${encodeURIComponent(c.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(json?.error ?? "Could not delete credential");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Optional scope banner — only shown when filtered to one household
          via the global switcher. Tells the user what they're looking at
          without forcing them up to the header to recheck. */}
      {scopedHousehold && (
        <div className="px-4 pt-1">
          <div className="rounded-full border border-accent/30 bg-accent/[0.06] px-3 py-1.5 text-center font-sans text-[11.5px] text-accent">
            Viewing <span className="font-semibold">{scopedHousehold.name}</span>{" "}
            + shared
          </div>
        </div>
      )}

      {/* Category pills + (admin) Add button */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <CategoryPills
            categories={categories}
            selected={selected}
            onChange={setSelected}
          />
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 font-sans text-[12.5px] font-semibold text-bg"
            style={{ boxShadow: "0 0 16px rgba(200,121,65,0.18)" }}
          >
            + Add
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="10"
                width="18"
                height="11"
                rx="2"
                stroke="var(--color-text-3)"
                strokeWidth="1.6"
              />
              <path
                d="M7 10V7a5 5 0 0 1 10 0v3"
                stroke="var(--color-text-3)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <p className="font-sans text-[14px] text-text-3">
              {scopedHousehold
                ? `Nothing in ${scopedHousehold.name} for this category yet.`
                : "No credentials in this category"}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 font-sans text-[13px] font-medium text-accent"
              >
                + Add credential
              </button>
            )}
          </div>
        ) : (
          filtered.map((cred) => (
            <CredentialRow
              key={cred.id}
              credential={cred}
              // Surface the household name on a row when it adds information:
              // - user is in multiple households, OR
              // - this row is shared (so the SHARED chip surfaces alongside
              //   the scoped household's items)
              showHouseholdChip={multiHousehold || cred.is_shared}
              admin={
                isAdmin
                  ? {
                      onEdit: () => openEdit(cred),
                      onDelete: () => void handleDelete(cred),
                      deleting: deletingId === cred.id,
                    }
                  : undefined
              }
            />
          ))
        )}
      </div>

      {isAdmin && sheet.open && (
        <CredentialForm
          open
          mode={sheet.mode}
          initial={sheet.mode === "edit" ? sheet.initial : null}
          initialBilling={
            sheet.mode === "edit" ? sheet.billing : null
          }
          canManageBilling={canManageBilling}
          households={households}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
