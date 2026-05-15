"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { cn } from "@/components/ui/cn";
import type { Tables } from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type HouseholdOption = { id: string; name: string };

const knowledgeSchema = z.object({
  household_id: z.string().nullable(),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.string(), // comma-separated → split on save
});

type KnowledgeFormValues = z.infer<typeof knowledgeSchema>;

export type KnowledgeFormProps = {
  households: HouseholdOption[];
  entry?: Tables<"knowledge_base"> | null;
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

export function KnowledgeForm({
  households,
  entry,
  onSaved,
  onCancel,
}: KnowledgeFormProps) {
  const isEdit = !!entry;
  const [errors, setErrors] = useState<
    Partial<Record<keyof KnowledgeFormValues, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = useState<KnowledgeFormValues>({
    household_id: entry?.household_id ?? null,
    title: entry?.title ?? "",
    content: entry?.content ?? "",
    tags: entry?.tags?.join(", ") ?? "",
  });

  function set<K extends keyof KnowledgeFormValues>(
    key: K,
    value: KnowledgeFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = knowledgeSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof KnowledgeFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof KnowledgeFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Convert comma-separated tags string → trimmed array
    const tagsArray = parsed.data.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      household_id: parsed.data.household_id,
      title: parsed.data.title,
      content: parsed.data.content,
      tags: tagsArray,
    };

    setServerError(null);
    startTransition(async () => {
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit ? { id: entry!.id, ...payload } : payload;

      const res = await fetch("/api/admin/knowledge", {
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
      <div className="w-full max-w-lg rounded-[18px] border border-border bg-bg p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-text">
          {isEdit ? "Edit Entry" : "Add Knowledge Entry"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Household */}
          <div>
            <Label htmlFor="household_id">Household</Label>
            <select
              id="household_id"
              className={inputClass}
              value={values.household_id ?? ""}
              onChange={(e) =>
                set("household_id", e.target.value === "" ? null : e.target.value)
              }
            >
              <option value="">All households (global)</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <input
              id="title"
              type="text"
              className={inputClass}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. WiFi passwords"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-[#C77575]">{errors.title}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              rows={6}
              className={cn(inputClass, "resize-y")}
              value={values.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Markdown supported (rendered as plain text in v1)"
            />
            {errors.content && (
              <p className="mt-1 text-xs text-[#C77575]">{errors.content}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <input
              id="tags"
              type="text"
              className={inputClass}
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="wifi, network, router"
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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
