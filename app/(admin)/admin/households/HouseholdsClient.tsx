"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HouseholdForm } from "@/components/admin/HouseholdForm";

type HouseholdRow = {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
  memberCount: number;
};

type Props = {
  initial: HouseholdRow[];
  openNew: boolean;
};

export function HouseholdsClient({ initial, openNew }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(openNew);
  const [editing, setEditing] = useState<HouseholdRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openEdit(h: HouseholdRow) {
    setEditing(h);
    setFormOpen(true);
  }

  function onFormClose() {
    setFormOpen(false);
    setEditing(null);
  }

  async function deleteHousehold(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/households?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="px-4 pb-20 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="font-display font-semibold text-text"
          style={{ fontSize: 26, letterSpacing: "0.01em" }}
        >
          Households
        </h1>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="rounded-full bg-accent px-4 py-2 font-sans text-sm font-semibold text-bg"
        >
          + New
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-surface px-4 py-10 text-center">
          <p className="font-sans text-sm text-text-3">No households yet.</p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-3 font-sans text-sm font-medium text-accent"
          >
            Add your first household
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
          {initial.map((h, i) => (
            <div
              key={h.id}
              className="flex items-center gap-3 px-3.5 py-3"
              style={{
                borderBottom:
                  i < initial.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/households/${h.id}`}
                  className="block truncate font-sans text-sm font-medium text-text hover:text-accent"
                >
                  {h.name}
                </Link>
                <p className="font-sans text-xs text-text-3">
                  {h.memberCount} member{h.memberCount === 1 ? "" : "s"}
                  {h.address ? ` · ${h.address}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(h)}
                className="font-sans text-xs text-text-2 transition-colors hover:text-text"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteHousehold(h.id, h.name)}
                disabled={deleting === h.id}
                className="font-sans text-xs text-destructive transition-colors hover:text-[#C77575]"
              >
                {deleting === h.id ? "…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

      <HouseholdForm
        open={formOpen}
        onClose={onFormClose}
        onSaved={() => router.refresh()}
        initial={
          editing
            ? { id: editing.id, name: editing.name, address: editing.address }
            : null
        }
      />
    </div>
  );
}
