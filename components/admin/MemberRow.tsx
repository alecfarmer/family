"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

export type MemberRowData = {
  memberId: string;
  userId: string;
  fullName: string;
  role: "admin" | "member";
  isHouseholdAdmin: boolean;
};

type MemberRowProps = {
  member: MemberRowData;
  onRemoved: () => void;
};

export function MemberRow({ member, onRemoved }: MemberRowProps) {
  const [isAdmin, setIsAdmin] = useState(member.isHouseholdAdmin);
  const [toggling, setToggling] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function toggleAdmin() {
    setToggling(true);
    try {
      await fetch("/api/admin/household-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.memberId,
          is_household_admin: !isAdmin,
        }),
      });
      setIsAdmin((v) => !v);
    } finally {
      setToggling(false);
    }
  }

  async function removeMember() {
    if (!confirm(`Remove ${member.fullName} from this household?`)) return;
    setRemoving(true);
    try {
      await fetch(`/api/admin/household-members?id=${member.memberId}`, {
        method: "DELETE",
      });
      onRemoved();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      {/* Avatar initial */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-bg"
        style={{
          background: "linear-gradient(135deg, var(--color-accent), #8a4f29)",
          fontSize: 13,
        }}
      >
        {member.fullName.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-medium text-text">
          {member.fullName}
        </p>
        <p className="font-sans text-xs text-text-3">
          {member.role === "admin" ? "App admin" : "Member"}
        </p>
      </div>

      {/* Household admin toggle */}
      <button
        type="button"
        onClick={toggleAdmin}
        disabled={toggling}
        className={cn(
          "rounded-full border px-2.5 py-1 font-sans text-xs font-medium transition-colors",
          isAdmin
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface text-text-3",
        )}
        aria-label={isAdmin ? "Revoke household admin" : "Make household admin"}
      >
        {isAdmin ? "HH admin" : "Member"}
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={removeMember}
        disabled={removing}
        className="font-sans text-xs text-destructive transition-colors hover:text-[#C77575]"
        aria-label="Remove member"
      >
        Remove
      </button>
    </div>
  );
}
