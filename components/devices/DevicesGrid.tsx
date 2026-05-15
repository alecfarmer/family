"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeviceCard } from "./DeviceCard";
import { DeviceForm, type HouseholdOption } from "@/components/admin/DeviceForm";
import type { Tables } from "@/lib/supabase/types";

export type DeviceRow = Tables<"devices"> & {
  household_name?: string | null;
};

type DevicesGridProps = {
  devices: DeviceRow[];
  isAdmin?: boolean;
  households?: HouseholdOption[];
};

export function DevicesGrid({
  devices,
  isAdmin = false,
  households = [],
}: DevicesGridProps) {
  const router = useRouter();
  const showHouseholdFilter = households.length >= 2;
  const [householdFilter, setHouseholdFilter] = useState<string>("all");

  const filtered =
    householdFilter === "all"
      ? devices
      : devices.filter((d) => d.household_id === householdFilter);

  const [sheet, setSheet] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; device: DeviceRow }
  >({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setSheet({ open: true, mode: "create" });
  }
  function openEdit(d: DeviceRow) {
    setSheet({ open: true, mode: "edit", device: d });
  }
  function closeSheet() {
    setSheet({ open: false });
  }
  function saved() {
    closeSheet();
    router.refresh();
  }

  async function handleDelete(d: DeviceRow) {
    if (deletingId) return;
    const ok = window.confirm(`Remove "${d.name}" from devices?`);
    if (!ok) return;
    setDeletingId(d.id);
    try {
      const res = await fetch(
        `/api/admin/devices?id=${encodeURIComponent(d.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        window.alert(json?.error ?? "Could not delete device");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Household filter (only when user is in 2+ households) */}
      {showHouseholdFilter && (
        <div className="px-4 pt-1 pb-1.5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "All" },
              ...households.map((h) => ({ key: h.id, label: h.name })),
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

      {/* Add button — top-right, only for admins */}
      {isAdmin && devices.length > 0 && (
        <div className="px-4 pb-2 pt-1 flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-accent px-3 py-1.5 font-sans text-[12.5px] font-semibold text-bg"
            style={{ boxShadow: "0 0 16px rgba(200,121,65,0.18)" }}
          >
            + Add device
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="font-sans text-[14px] text-text-2">
            No devices tracked yet.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 font-sans text-[13px] font-medium text-accent"
            >
              + Add the first one
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 px-4 pb-5 pt-1.5">
          {filtered.map((d) => (
            <div key={d.id} className="relative">
              <DeviceCard
                device={d}
                showHouseholdChip={showHouseholdFilter}
              />
              {isAdmin && (
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEdit(d);
                    }}
                    aria-label={`Edit ${d.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 backdrop-blur-sm"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"
                        stroke="var(--color-text-2)"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === d.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDelete(d);
                    }}
                    aria-label={`Delete ${d.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 backdrop-blur-sm disabled:opacity-50"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3.5 4.5h9M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M5 4.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8"
                        stroke="#C77575"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && sheet.open && (
        <DeviceForm
          households={households}
          device={sheet.mode === "edit" ? sheet.device : null}
          onSaved={saved}
          onCancel={closeSheet}
        />
      )}
    </>
  );
}
