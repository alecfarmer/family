"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import type { CredentialInitial } from "./CredentialForm";

export type AdminCredentialRowData = CredentialInitial & {
  updated_at: string;
};

type AdminCredentialRowProps = {
  credential: AdminCredentialRowData;
  householdName: string | null; // null when household_id is null (shared)
  onEdit: (cred: AdminCredentialRowData) => void;
};

export function AdminCredentialRow({
  credential,
  householdName,
  onEdit,
}: AdminCredentialRowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    const ok = window.confirm(
      `Delete "${credential.service_name}"? This cannot be undone.`,
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/credentials?id=${encodeURIComponent(credential.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(json?.error ?? "Could not delete");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  const sharedAll = credential.household_id === null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[14px] border border-border border-l-[3px] border-l-accent bg-surface px-3.5 py-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="font-display font-semibold text-text"
              style={{ fontSize: 17, letterSpacing: "0.01em" }}
            >
              {credential.service_name}
            </span>
            {sharedAll ? (
              <Badge tone="accent">SHARED</Badge>
            ) : householdName ? (
              <Badge tone="neutral">{householdName}</Badge>
            ) : null}
          </div>
          {credential.username && (
            <span className="truncate font-mono text-[12.5px] text-text-2">
              {credential.username}
            </span>
          )}
          <span
            className="mt-1 font-sans text-[11.5px] uppercase text-text-3"
            style={{ letterSpacing: "0.1em" }}
          >
            {credential.category.replace("_", " ")}
          </span>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(credential)}
            disabled={deleting}
            className="rounded-[8px] border border-border bg-surface-elevated px-3 py-1.5 font-sans text-[12px] font-medium text-text disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-[8px] border border-border bg-surface-elevated px-3 py-1.5 font-sans text-[12px] font-medium text-[#C77575] disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
      {error && (
        <p className="font-sans text-[12px] text-[#C77575]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
