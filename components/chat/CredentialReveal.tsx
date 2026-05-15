"use client";

import { useState } from "react";
import { CopyIcon, EyeIcon } from "@/components/ui/icons";
import {
  copyAndToast,
  useCopyToast,
} from "@/components/notifications/CopyToastProvider";
import { cn } from "@/components/ui/cn";

type CredFieldProps = {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
  trailing?: React.ReactNode;
  onCopy: () => void;
};

function CredField({
  label,
  value,
  mono = false,
  small = false,
  trailing,
  onCopy,
}: CredFieldProps) {
  return (
    <div className="mb-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-3">
        {label}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2.5 py-2">
        <span
          className={cn(
            "flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-text",
            mono ? "font-mono" : "font-sans",
            small ? "text-[12px]" : "text-[13.5px]",
          )}
        >
          {value}
        </span>
        <div className="flex items-center gap-1">
          {trailing}
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="flex items-center justify-center rounded p-1 text-text-2 hover:text-text"
          >
            <CopyIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export type CredentialRevealProps = {
  service: string;
  username: string;
  password: string;
  url?: string;
  sharedWith?: boolean;
  className?: string;
};

export function CredentialReveal({
  service,
  username,
  password,
  url,
  sharedWith,
  className,
}: CredentialRevealProps) {
  const [showPassword, setShowPassword] = useState(false);
  const showToast = useCopyToast();

  const maskedPassword = "•".repeat(Math.min(password.length, 16));

  return (
    <div
      className={cn("mt-2.5 rounded-[14px] p-3.5", className)}
      style={{
        background: "rgba(200,121,65,0.04)",
        border: "1px solid rgba(200,121,65,0.20)",
        boxShadow: "inset 0 0 24px rgba(200,121,65,0.15)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[19px] font-semibold tracking-[0.01em] text-text">
          {service}
        </span>
        {sharedWith && (
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-accent">
            Shared
          </span>
        )}
      </div>

      <CredField
        label="Username"
        value={username}
        mono
        onCopy={() => copyAndToast(username, "Username copied", showToast)}
      />

      <CredField
        label="Password"
        value={showPassword ? password : maskedPassword}
        mono
        onCopy={() => copyAndToast(password, "Password copied", showToast)}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Reveal password"}
            className="flex items-center justify-center rounded p-1 text-text-2 hover:text-text"
          >
            <EyeIcon open={showPassword} size={16} />
          </button>
        }
      />

      {url && (
        <CredField
          label="URL"
          value={url}
          small
          onCopy={() => copyAndToast(url, "URL copied", showToast)}
        />
      )}
    </div>
  );
}
