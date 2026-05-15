"use client";

import { useRef, useState } from "react";
import type { DeviceAttachmentListItem } from "@/lib/deviceAttachments";

type AttachmentSectionProps = {
  deviceId: string;
  initialAttachments: DeviceAttachmentListItem[];
  canManage: boolean;
};

// ---------------------------------------------------------------------------
// File-type icons — 1.8px stroke, 22×22, matching the rest of the device
// design language (see DeviceIcons.tsx).
// ---------------------------------------------------------------------------

function PdfIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h8l4 4v14H6V3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M8.5 12.5h7M8.5 15.5h7M8.5 18h4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke={color} strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.6" stroke={color} strokeWidth="1.8" />
      <path
        d="M3.5 17l5-5 4 4 3-3 5 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h8l4 4v14H6V3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function AttachmentIcon({ mime, color }: { mime: string; color: string }) {
  if (mime === "application/pdf") return <PdfIcon color={color} />;
  if (mime.startsWith("image/")) return <ImageIcon color={color} />;
  return <FileIcon color={color} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_PICKER_TYPES = "application/pdf,image/*,text/plain";

export function AttachmentSection({
  deviceId,
  initialAttachments,
  canManage,
}: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function triggerPicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/devices/${deviceId}/attachments`, {
        method: "POST",
        body,
      });
      const json = (await res.json().catch(() => null)) as {
        attachment?: DeviceAttachmentListItem;
        error?: string;
      } | null;

      if (!res.ok || !json?.attachment) {
        setError(json?.error ?? "Upload failed");
        return;
      }
      // Optimistic prepend — server already sorted desc by created_at.
      setAttachments((prev) => [json.attachment as DeviceAttachmentListItem, ...prev]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(att: DeviceAttachmentListItem) {
    if (deletingId) return;
    const ok = window.confirm(`Remove "${att.file_name}"?`);
    if (!ok) return;

    setDeletingId(att.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/devices/${deviceId}/attachments/${att.id}`,
        { method: "DELETE" },
      );
      if (!res.ok && res.status !== 204) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error ?? "Could not delete attachment");
        return;
      }
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch {
      setError("Could not delete attachment");
    } finally {
      setDeletingId(null);
    }
  }

  const empty = attachments.length === 0;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2
          className="font-sans font-semibold uppercase text-text-3"
          style={{ fontSize: 10.5, letterSpacing: "0.12em" }}
        >
          Attachments
        </h2>
        {canManage && (
          <>
            <button
              type="button"
              onClick={triggerPicker}
              disabled={uploading}
              className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-sans text-[12px] font-medium text-accent disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "+ Add attachment"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_PICKER_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {error && (
        <p className="mb-2 font-sans text-[12px] text-[#C77575]">{error}</p>
      )}

      {empty ? (
        <p className="rounded-[12px] border border-border bg-surface p-[12px_14px] font-sans text-[13px] text-text-2">
          No attachments yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((att) => {
            const isImage = att.mime_type.startsWith("image/");
            const isDeleting = deletingId === att.id;
            return (
              <li
                key={att.id}
                className="flex items-center gap-3 rounded-[12px] border border-border bg-surface p-[10px_12px]"
              >
                {isImage && att.url ? (
                  // Square thumbnail for images so a user can recognize the
                  // receipt at a glance. Plain <img> — Next/Image with signed
                  // URLs adds friction (must be allowlisted per host).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt={att.file_name}
                    width={60}
                    height={60}
                    className="h-[60px] w-[60px] flex-shrink-0 rounded-[8px] border border-border object-cover"
                  />
                ) : (
                  <div
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] border border-accent/[0.20]"
                    style={{ background: "rgba(200,121,65,0.08)" }}
                  >
                    <AttachmentIcon
                      mime={att.mime_type}
                      color="var(--color-accent)"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[14px] text-text">
                    {att.file_name}
                  </p>
                  <p className="font-sans text-[12px] text-text-2">
                    {formatFileSize(att.size_bytes)}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {att.url ? (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border bg-bg/80 px-3 py-1 font-sans text-[12px] font-medium text-text"
                    >
                      Open
                    </a>
                  ) : null}
                  {canManage && (
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => void handleDelete(att)}
                      aria-label={`Delete ${att.file_name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 disabled:opacity-50"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.5 4.5h9M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M5 4.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8"
                          stroke="#C77575"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
