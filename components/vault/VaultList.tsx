"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryPills } from "./CategoryPills";
import { CredentialRow, type CredentialRowData } from "./CredentialRow";
import {
  CredentialForm,
  type CredentialInitial,
  type HouseholdOption,
} from "@/components/admin/CredentialForm";

export type VaultCredential = CredentialRowData & {
  category: string;
  // The admin form needs these fields when editing. They're not sensitive
  // — the encrypted password blob never leaves the server.
  household_id: string | null;
  household_name: string | null;
  url: string | null;
  notes: string | null;
};

const SHARED_KEY = "__shared__";

type VaultListProps = {
  credentials: VaultCredential[];
  categories: string[];
  /** When true, render add/edit/delete affordances. */
  isAdmin?: boolean;
  /** Supplied to the credential form's household select (admin) and to the
      household filter pills (everyone). */
  households?: HouseholdOption[];
};

export function VaultList({
  credentials,
  categories,
  isAdmin = false,
  households = [],
}: VaultListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState("All");
  // Household filter — only shown if user belongs to ≥2 households (or sees
  // at least one shared credential alongside their household creds).
  const showHouseholdFilter = households.length >= 2;
  const [householdFilter, setHouseholdFilter] = useState<string>("all");

  const [sheet, setSheet] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; initial: CredentialInitial }
  >({ open: false });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = credentials.filter((c) => {
    if (selected !== "All" && c.category !== selected) return false;
    if (householdFilter !== "all") {
      if (householdFilter === SHARED_KEY) {
        if (!(c.is_shared || c.household_id === null)) return false;
      } else if (c.household_id !== householdFilter) {
        return false;
      }
    }
    return true;
  });

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
      {/* Household filter (only shown when the user is in 2+ households) */}
      {showHouseholdFilter && (
        <div className="px-4 pt-3 pb-1.5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "All" },
              ...households.map((h) => ({ key: h.id, label: h.name })),
              { key: SHARED_KEY, label: "Shared" },
            ].map((p) => {
              const active = householdFilter === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setHouseholdFilter(p.key)}
                  className={
                    "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-medium " +
                    (active
                      ? "bg-accent text-bg"
                      : "border border-border bg-surface text-text-2")
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pinned category pills + (admin) Add button */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-2">
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
              No credentials in this category
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
              // Only surface the household name when it adds information —
              // i.e. the user is in multiple households or this credential is
              // shared across them.
              showHouseholdChip={showHouseholdFilter || cred.is_shared}
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
          households={households}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
