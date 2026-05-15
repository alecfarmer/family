"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { cn } from "@/components/ui/cn";
import type { Tables } from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type HouseholdOption = { id: string; name: string };

const deviceSchema = z.object({
  household_id: z.string().min(1, "Household is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "tv",
    "router",
    "modem",
    "phone",
    "tablet",
    "laptop",
    "desktop",
    "smart_home",
    "other",
  ]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional(),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

export type DeviceFormProps = {
  households: HouseholdOption[];
  device?: Tables<"devices"> | null;
  onSaved: () => void;
  onCancel: () => void;
};

// ── Field helpers ─────────────────────────────────────────────────────────────

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block font-sans text-xs font-medium text-text-2"
    >
      {children}
    </label>
  );
}

const inputClass = cn(
  "w-full rounded-lg border border-border bg-surface px-3 py-2",
  "font-sans text-sm text-text placeholder:text-text-3",
  "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40",
);

// ── Component ─────────────────────────────────────────────────────────────────

export function DeviceForm({
  households,
  device,
  onSaved,
  onCancel,
}: DeviceFormProps) {
  const isEdit = !!device;
  const [errors, setErrors] = useState<
    Partial<Record<keyof DeviceFormValues, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = useState<DeviceFormValues>({
    household_id: device?.household_id ?? households[0]?.id ?? "",
    name: device?.name ?? "",
    type: device?.type ?? "other",
    brand: device?.brand ?? "",
    model: device?.model ?? "",
    serial_number: device?.serial_number ?? "",
    purchase_date: device?.purchase_date ?? "",
    warranty_expiry: device?.warranty_expiry ?? "",
    notes: device?.notes ?? "",
  });

  function set<K extends keyof DeviceFormValues>(
    key: K,
    value: DeviceFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = deviceSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof DeviceFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof DeviceFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const url = isEdit
        ? `/api/admin/devices`
        : `/api/admin/devices`;
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { id: device!.id, ...parsed.data }
        : parsed.data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setServerError(
          (json as { error?: string }).error ?? "Something went wrong",
        );
        return;
      }

      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[18px] border border-border bg-bg p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-text">
          {isEdit ? "Edit Device" : "Add Device"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Household */}
          <div>
            <Label htmlFor="household_id">Household</Label>
            <select
              id="household_id"
              className={inputClass}
              value={values.household_id}
              onChange={(e) => set("household_id", e.target.value)}
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            {errors.household_id && (
              <p className="mt-1 text-xs text-[#C77575]">{errors.household_id}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <input
              id="name"
              type="text"
              className={inputClass}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Living Room TV"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[#C77575]">{errors.name}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className={inputClass}
              value={values.type}
              onChange={(e) =>
                set(
                  "type",
                  e.target.value as DeviceFormValues["type"],
                )
              }
            >
              {(
                [
                  "tv",
                  "router",
                  "modem",
                  "phone",
                  "tablet",
                  "laptop",
                  "desktop",
                  "smart_home",
                  "other",
                ] as const
              ).map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Brand / Model row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <input
                id="brand"
                type="text"
                className={inputClass}
                value={values.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Samsung"
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <input
                id="model"
                type="text"
                className={inputClass}
                value={values.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="QN85B"
              />
            </div>
          </div>

          {/* Serial number */}
          <div>
            <Label htmlFor="serial_number">Serial Number</Label>
            <input
              id="serial_number"
              type="text"
              className={inputClass}
              value={values.serial_number}
              onChange={(e) => set("serial_number", e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <input
                id="purchase_date"
                type="date"
                className={inputClass}
                value={values.purchase_date}
                onChange={(e) => set("purchase_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
              <input
                id="warranty_expiry"
                type="date"
                className={inputClass}
                value={values.warranty_expiry}
                onChange={(e) => set("warranty_expiry", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              className={cn(inputClass, "resize-none")}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {serverError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-[#C77575]">
              {serverError}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-border px-4 py-2 font-sans text-sm text-text-2 hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-accent px-4 py-2 font-sans text-sm font-medium text-bg disabled:opacity-60"
            >
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
