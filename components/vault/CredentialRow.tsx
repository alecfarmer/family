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
};

type CredentialRowProps = {
  credential: CredentialRowData;
};

const CLEAR_AFTER_MS = 30_000;

export function CredentialRow({ credential }: CredentialRowProps) {
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
        {/* Service name + shared badge */}
        <div className="mb-1 flex items-center gap-2">
          <span
            className="font-display font-semibold text-text"
            style={{ fontSize: 18, letterSpacing: "0.01em" }}
          >
            {service_name}
          </span>
          {is_shared && <Badge tone="accent">SHARED</Badge>}
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

      {/* Right column — eye + copy */}
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
      </div>
    </div>
  );
}
