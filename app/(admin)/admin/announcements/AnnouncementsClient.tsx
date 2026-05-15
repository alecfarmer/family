"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/admin/FormField";
import { Badge } from "@/components/ui/Badge";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  ALL_HOUSEHOLDS,
  expiryToDateInput,
  type AnnouncementActionResult,
} from "./actions";

export type HouseholdOption = { id: string; name: string };

export type AnnouncementRow = {
  id: string;
  household_id: string | null;
  author_id: string | null;
  author_name: string | null;
  title: string;
  body: string;
  created_at: string;
  expires_at: string | null;
};

type Mode = "create" | "edit";

type FormState = {
  title: string;
  body: string;
  household_id: string; // ALL_HOUSEHOLDS | uuid
  expires_at: string; // YYYY-MM-DD or ""
};

const EMPTY: FormState = {
  title: "",
  body: "",
  household_id: ALL_HOUSEHOLDS,
  expires_at: "",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatExpiry(iso: string | null) {
  if (!iso) return "Never expires";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  announcements: AnnouncementRow[];
  households: HouseholdOption[];
  /** True for app admins (`users.role='admin'`). Drives whether the scope
   * picker shows every household or only the ones this user can administer.
   * Household-admin entry to this page is dead code today (the layout
   * `requireAdmin()`s), but the logic is here for when that opens up. */
  isAppAdmin: boolean;
};

export function AnnouncementsClient({
  announcements,
  households,
  isAppAdmin,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, setState] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setState({
      ...EMPTY,
      // Household admins (the dead-code branch) default to their single
      // household so the picker isn't surprising when it shows up.
      household_id:
        !isAppAdmin && households.length > 0 ? households[0].id : ALL_HOUSEHOLDS,
    });
    setOpen(true);
  }

  function openEdit(row: AnnouncementRow) {
    setMode("edit");
    setEditingId(row.id);
    setState({
      title: row.title,
      body: row.body,
      household_id: row.household_id ?? ALL_HOUSEHOLDS,
      expires_at: expiryToDateInput(row.expires_at),
    });
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (!state.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!state.body.trim()) {
      setError("Body is required");
      return;
    }

    const fd = new FormData();
    fd.set("title", state.title.trim());
    fd.set("body", state.body.trim());
    fd.set("household_id", state.household_id);
    fd.set("expires_at", state.expires_at);

    startTransition(async () => {
      let result: AnnouncementActionResult;
      if (mode === "edit" && editingId) {
        fd.set("id", editingId);
        result = await updateAnnouncement(fd);
      } else {
        result = await createAnnouncement(fd);
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      close();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteAnnouncement(fd);
      if (!result.ok) {
        alert(`Could not delete: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  const householdOptions = [
    // App admin sees "All households" + every household. Household admin
    // only sees the households they administer (passed in via `households`).
    ...(isAppAdmin
      ? [{ value: ALL_HOUSEHOLDS, label: "All households (global)" }]
      : []),
    ...households.map((h) => ({ value: h.id, label: h.name })),
  ];

  const now = Date.now();
  const active: AnnouncementRow[] = [];
  const expired: AnnouncementRow[] = [];
  for (const row of announcements) {
    if (row.expires_at && new Date(row.expires_at).getTime() < now) {
      expired.push(row);
    } else {
      active.push(row);
    }
  }

  function scopeLabel(householdId: string | null) {
    if (!householdId) return "All households";
    return households.find((h) => h.id === householdId)?.name ?? "Unknown";
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div className="font-sans text-[13px] text-text-2">
          {active.length} active · {expired.length} expired
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-accent px-4 py-2 font-sans text-[13px] font-semibold text-bg"
        >
          + New Announcement
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        <Section
          label="Active"
          tone="accent"
          rows={active}
          scopeLabel={scopeLabel}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
        <Section
          label="Expired"
          tone="neutral"
          rows={expired}
          scopeLabel={scopeLabel}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {open && (
        <FormSheet
          mode={mode}
          state={state}
          set={set}
          householdOptions={householdOptions}
          error={error}
          pending={pending}
          onClose={close}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function Section({
  label,
  tone,
  rows,
  scopeLabel,
  onEdit,
  onDelete,
}: {
  label: string;
  tone: "accent" | "neutral";
  rows: AnnouncementRow[];
  scopeLabel: (id: string | null) => string;
  onEdit: (row: AnnouncementRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 pl-1">
        <p
          className="font-sans font-semibold uppercase text-text-3"
          style={{ fontSize: 10.5, letterSpacing: "0.14em" }}
        >
          {label}
        </p>
        <Badge tone={tone === "accent" ? "accent" : "neutral"}>
          {rows.length}
        </Badge>
      </div>
      {rows.length === 0 ? (
        <p className="px-1 font-sans text-[13px] text-text-3">
          {label === "Active" ? "Nothing posted yet." : "No expired posts."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <AnnouncementRowCard
              key={row.id}
              row={row}
              scope={scopeLabel(row.household_id)}
              onEdit={() => onEdit(row)}
              onDelete={() => onDelete(row.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementRowCard({
  row,
  scope,
  onEdit,
  onDelete,
}: {
  row: AnnouncementRow;
  scope: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[14px] font-semibold leading-[1.25] text-text">
            {row.title}
          </p>
          <p className="mt-1 font-sans text-[13px] leading-[1.4] text-text-2">
            {row.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[11px] text-text-3">
            <span>Scope: {scope}</span>
            <span>·</span>
            <span>Posted {formatDate(row.created_at)}</span>
            <span>·</span>
            <span>{formatExpiry(row.expires_at)}</span>
            {row.author_name && (
              <>
                <span>·</span>
                <span>by {row.author_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-text-2 hover:bg-surface-elevated"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-[#C77575] hover:bg-surface-elevated"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSheet({
  mode,
  state,
  set,
  householdOptions,
  error,
  pending,
  onClose,
  onSubmit,
}: {
  mode: Mode;
  state: FormState;
  set: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  householdOptions: { value: string; label: string }[];
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "Edit announcement" : "New announcement"}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      <div
        className="absolute right-0 left-0 bottom-0 flex flex-col bg-surface-elevated border-t border-border md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:w-[440px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px]"
        style={{
          top: 60,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-[38px] rounded-full bg-border-strong" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="font-sans text-[14px] text-text-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <h2
            className="m-0 font-display font-semibold text-text"
            style={{ fontSize: 20, letterSpacing: "0.01em" }}
          >
            {mode === "edit" ? "Edit Announcement" : "New Announcement"}
          </h2>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="font-sans font-semibold text-accent disabled:opacity-50"
            style={{ fontSize: 14 }}
          >
            {pending ? "Saving…" : "Post"}
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 pt-4 pb-8">
          <FormField
            name="title"
            label="Title"
            value={state.title}
            onChange={(v) => set("title", v)}
            required
            placeholder="Power outage this Saturday"
          />

          <FormField
            name="body"
            label="Body"
            multiline
            value={state.body}
            onChange={(v) => set("body", v)}
            required
            placeholder="Duke Energy is doing line work — expect 9a–11a outage."
          />

          <FormField
            name="household_id"
            label="Scope"
            select
            value={state.household_id}
            options={householdOptions}
            onChange={(v) => set("household_id", v)}
          />

          <FormField
            name="expires_at"
            label="Expires (optional)"
            value={state.expires_at}
            onChange={(v) => set("expires_at", v)}
            type="date"
            small
          />

          {error && (
            <p className="mt-4 font-sans text-[13px] text-[#C77575]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
