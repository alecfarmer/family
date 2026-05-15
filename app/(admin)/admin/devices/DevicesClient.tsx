"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { DeviceForm } from "@/components/admin/DeviceForm";
import type { Tables } from "@/lib/supabase/types";
import type { HouseholdOption } from "@/components/admin/DeviceForm";

export type DeviceRow = Tables<"devices"> & {
  household_name: string;
};

export function DevicesClient({
  devices,
  households,
}: {
  devices: DeviceRow[];
  households: HouseholdOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Tables<"devices"> | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? devices
      : devices.filter((d) => d.household_id === filter);

  async function handleDelete(id: string) {
    if (!confirm("Delete this device?")) return;
    setDeletingId(id);
    await fetch("/api/admin/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    router.refresh();
  }

  function onSaved() {
    setEditing(null);
    setAdding(false);
    router.refresh();
  }

  return (
    <>
      {/* Filter + add */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 font-sans text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent/40"
        >
          <option value="all">All households</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-accent px-3 py-2 font-sans text-sm font-medium text-bg"
        >
          + Add Device
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="font-sans text-sm text-text-2">No devices found</div>
          <button
            onClick={() => setAdding(true)}
            className="mt-2 font-sans text-sm text-accent underline"
          >
            Add the first one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-[12px] border border-border bg-surface p-3.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans text-sm font-medium text-text">
                    {d.name}
                  </span>
                  <Badge tone="neutral">{d.type.replace("_", " ")}</Badge>
                </div>
                <div className="mt-0.5 font-sans text-xs text-text-3">
                  {d.household_name}
                  {d.brand && ` · ${d.brand}`}
                  {d.model && ` ${d.model}`}
                  {d.serial_number && ` · SN: ${d.serial_number}`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setEditing(d)}
                  className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-text-2 hover:bg-surface-elevated"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={deletingId === d.id}
                  className="rounded-lg border border-destructive/40 px-3 py-1.5 font-sans text-xs text-[#C77575] hover:bg-destructive/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(adding || editing) && (
        <DeviceForm
          households={households}
          device={editing}
          onSaved={onSaved}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
