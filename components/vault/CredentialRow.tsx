"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CopyIcon, EyeIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import {
  copyAndToast,
  useCopyToast,
} from "@/components/notifications/CopyToastProvider";

export type CredentialRowData = {
  id: string;
  service_name: string;
  username: string | null;
  is_shared: boolean;
  household_name?: string | null;
  /** Pre-computed urgency for the renegotiation chip (admin-only).
   *  - "expired" → past the lock date, render red chip "Renegotiate now"
   *  - "soon"    → within 14 days, render amber chip "Renegotiate by …"
   *  - other values / undefined → no chip
   */
  renegotiationChip?: {
    urgency: "expired" | "soon";
    label: string;
  } | null;
};

export type CredentialRowAdmin = {
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

type CredentialRowProps = {
  credential: CredentialRowData;
  /** When supplied, shows admin edit + delete buttons alongside eye+copy. */
  admin?: CredentialRowAdmin;
  /** When true, the row shows the household name (or SHARED) as a small chip. */
  showHouseholdChip?: boolean;
};

const CLEAR_AFTER_MS = 30_000;

export function CredentialRow({
  credential,
  admin,
  showHouseholdChip,
}: CredentialRowProps) {
  const { id, service_name, username, is_shared } = credential;
  const showCopyToast = useCopyToast();

  const [revealed, setRevealed] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClear() {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setPassword(null);
      setRevealed(false);
      clearTimerRef.current = null;
    }, CLEAR_AFTER_MS);
  }

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  async function fetchPassword(): Promise<string | null> {
    setLoading(true);
    try {
      const res = await fetch(`/api/credentials/${id}/reveal`, {
        method: "POST",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { password?: string };
      return json.password ?? null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleEye() {
    if (revealed) {
      // Hide — clear the cached value so next reveal re-fetches and re-logs
      setRevealed(false);
      setPassword(null);
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      return;
    }

    if (password !== null) {
      // Already cached — just show
      setRevealed(true);
      scheduleClear();
      return;
    }

    // Fetch, cache, reveal
    const plaintext = await fetchPassword();
    if (plaintext === null) return;
    setPassword(plaintext);
    setRevealed(true);
    scheduleClear();
  }

  async function handleCopy() {
    const plaintext =
      password !== null ? password : await fetchPassword();
    if (plaintext === null) return;
    // Cache for the 30s window (but don't set revealed)
    if (password === null) {
      setPassword(plaintext);
      scheduleClear();
    }
    copyAndToast(plaintext, `${service_name} password copied`, showCopyToast);
  }

  const iconColor = "var(--color-text-2)";

  return (
    <div
      className={cn(
        "bg-surface rounded-[14px] border border-border",
        "border-l-[3px] border-l-accent",
        "flex items-center gap-3 px-3.5 py-3.5",
      )}
    >
      {/* Left content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Service name + shared/household + renegotiation chips */}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className="font-display font-semibold text-text"
            style={{ fontSize: 18, letterSpacing: "0.01em" }}
          >
            {service_name}
          </span>
          {showHouseholdChip &&
            (is_shared || !credential.household_name ? (
              <Badge tone="accent">SHARED</Badge>
            ) : (
              <Badge tone="neutral">{credential.household_name}</Badge>
            ))}
          {credential.renegotiationChip && (
            <Badge
              tone={
                credential.renegotiationChip.urgency === "expired"
                  ? "danger"
                  : "warning"
              }
            >
              {credential.renegotiationChip.label}
            </Badge>
          )}
        </div>

        {/* Username */}
        {username && (
          <span className="truncate font-mono text-[12.5px] text-text-2">
            {username}
          </span>
        )}

        {/* Password row */}
        <span
          className="mt-1.5 font-mono text-[13px] text-text-3"
          style={{ letterSpacing: "0.15em" }}
        >
          {revealed && password !== null ? password : "••••••••••"}
        </span>
      </div>

      {/* Right column — eye + copy (always) + admin edit + delete (when admin) */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleEye}
          disabled={loading}
          aria-label={revealed ? "Hide password" : "Reveal password"}
          className={cn(
            "flex h-[34px] w-[34px] items-center justify-center rounded-[8px]",
            "border border-border bg-surface-elevated",
            "transition-opacity",
            loading && "opacity-50",
          )}
        >
          <EyeIcon open={revealed} size={16} c={iconColor} />
        </button>

        <button
          onClick={handleCopy}
          disabled={loading}
          aria-label="Copy password"
          className={cn(
            "flex h-[34px] w-[34px] items-center justify-center rounded-[8px]",
            "border border-border bg-surface-elevated",
            "transition-opacity",
            loading && "opacity-50",
          )}
        >
          <CopyIcon size={15} c={iconColor} />
        </button>

        {admin && (
          <>
            <button
              onClick={admin.onEdit}
              aria-label="Edit credential"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-border bg-surface-elevated"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"
                  stroke={iconColor}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={admin.onDelete}
              disabled={admin.deleting}
              aria-label="Delete credential"
              className={cn(
                "flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-border bg-surface-elevated",
                admin.deleting && "opacity-50",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.5 4.5h9M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M5 4.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8"
                  stroke="#C77575"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
