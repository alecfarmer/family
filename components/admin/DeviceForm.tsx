"use client";

import { useRef, useState, useTransition } from "react";
import { z } from "zod";
import { cn } from "@/components/ui/cn";
import type { Tables } from "@/lib/supabase/types";

// ── Camera scan helpers ──────────────────────────────────────────────────────

/**
 * Resize a captured photo on the client before uploading. Vision-quality is
 * preserved at ~1280px wide and the resulting JPEG (q=0.85) is small enough
 * (~100–400 KB) to fit inside Vercel's 4.5 MB function body limit easily.
 */
async function compressToBase64(file: File, maxDim = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const ratio = Math.min(maxDim / bmp.width, maxDim / bmp.height, 1);
  const w = Math.round(bmp.width * ratio);
  const h = Math.round(bmp.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_2d_unavailable");
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

type ScanResult = {
  name: string;
  type:
    | "tv"
    | "router"
    | "modem"
    | "phone"
    | "tablet"
    | "laptop"
    | "desktop"
    | "smart_home"
    | "other";
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
};

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<
    | { kind: "idle" }
    | { kind: "scanning" }
    | { kind: "done"; confidence: ScanResult["confidence"] }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

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

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so re-picking the same image still fires onChange.
    e.target.value = "";
    if (!file) return;
    setScanState({ kind: "scanning" });
    setServerError(null);
    try {
      const image = await compressToBase64(file);
      const res = await fetch("/api/admin/devices/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error ?? `scan_failed_${res.status}`);
      }
      const data = (await res.json()) as ScanResult;
      // Merge: only overwrite empty fields so we don't clobber a user's typing.
      setValues((v) => ({
        ...v,
        name: v.name || data.name,
        type: v.type === "other" ? data.type : v.type,
        brand: v.brand || data.brand || "",
        model: v.model || data.model || "",
        serial_number: v.serial_number || data.serial_number || "",
        notes: v.notes || data.notes || "",
      }));
      setScanState({ kind: "done", confidence: data.confidence });
    } catch (err) {
      const message = err instanceof Error ? err.message : "scan_failed";
      setScanState({ kind: "error", message });
    }
  }

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

        {/* Camera scan — opens the rear camera on iOS Safari via the
            capture=environment hint, hands the photo to Claude vision, and
            pre-fills empty form fields with what it can see. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleCapture}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanState.kind === "scanning"}
          className={cn(
            "mb-4 flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-3",
            "border border-accent/40 bg-accent/10 text-accent",
            "font-sans text-sm font-medium",
            "transition hover:bg-accent/15 disabled:opacity-60",
          )}
          style={{ boxShadow: "0 0 24px rgba(200,121,65,0.15)" }}
        >
          {scanState.kind === "scanning" ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Looking at your photo…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 7h4l2-3h6l2 3h4v13H3z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              {scanState.kind === "done"
                ? "Scan again"
                : "Scan with camera"}
            </>
          )}
        </button>

        {scanState.kind === "done" && (
          <p className="-mt-2 mb-3 text-center font-sans text-[11.5px] text-text-2">
            {scanState.confidence === "high"
              ? "Filled what I could see. Review and tweak before saving."
              : scanState.confidence === "medium"
                ? "Best guess based on what's visible — double-check brand and model."
                : "Hard to tell from this photo. Try a closer shot of the model label."}
          </p>
        )}

        {scanState.kind === "error" && (
          <p className="-mt-2 mb-3 text-center font-sans text-[11.5px] text-[#C77575]">
            Couldn&apos;t read the photo. Try a clearer shot of the device label.
          </p>
        )}

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
