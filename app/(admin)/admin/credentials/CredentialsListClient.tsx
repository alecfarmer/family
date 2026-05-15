"use client";

import { useState } from "react";
import {
  AdminCredentialRow,
  type AdminCredentialRowData,
} from "@/components/admin/CredentialRow";
import {
  CredentialForm,
  type CredentialInitial,
  type HouseholdOption,
} from "@/components/admin/CredentialForm";

type CredentialsListClientProps = {
  credentials: AdminCredentialRowData[];
  households: HouseholdOption[];
  /** Map of credential.id → existing admin-only private notes string. */
  adminNotesByCredId?: Record<string, string>;
};

export function CredentialsListClient({
  credentials,
  households,
  adminNotesByCredId = {},
}: CredentialsListClientProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [initial, setInitial] = useState<CredentialInitial | null>(null);

  function householdName(id: string | null) {
    if (!id) return null;
    return households.find((h) => h.id === id)?.name ?? null;
  }

  function openCreate() {
    setMode("create");
    setInitial(null);
    setOpen(true);
  }

  function openEdit(cred: AdminCredentialRowData) {
    setMode("edit");
    setInitial(cred);
    setOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div className="font-sans text-[13px] text-text-2">
          {credentials.length} credential{credentials.length === 1 ? "" : "s"}
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-accent px-4 py-2 font-sans text-[13px] font-semibold text-bg"
        >
          + Add Credential
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4">
        {credentials.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="font-sans text-[14px] text-text-3">
              No credentials yet. Tap “+ Add Credential” to create one.
            </p>
          </div>
        ) : (
          credentials.map((cred) => (
            <AdminCredentialRow
              key={cred.id}
              credential={cred}
              householdName={householdName(cred.household_id)}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      <CredentialForm
        open={open}
        mode={mode}
        initial={initial}
        households={households}
        // The admin credentials page is app-admin only, so the form's
        // admin-only sections (billing, admin notes) should always render.
        canManageBilling
        initialAdminNotes={
          mode === "edit" && initial
            ? (adminNotesByCredId[initial.id] ?? null)
            : null
        }
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
