"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MemberRow, type MemberRowData } from "@/components/admin/MemberRow";
import { cn } from "@/components/ui/cn";

type Props = {
  householdId: string;
  initialMembers: MemberRowData[];
  eligibleUsers: { id: string; full_name: string }[];
};

export function HouseholdDetailClient({ householdId, initialMembers, eligibleUsers }: Props) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function addMember() {
    if (!selectedUserId) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/household-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: householdId, user_id: selectedUserId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add member.");
        return;
      }
      setSelectedUserId("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Members list */}
      <div>
        <p
          className="mb-2 font-sans font-semibold uppercase text-text-3"
          style={{ fontSize: 11, letterSpacing: "0.14em" }}
        >
          Members ({initialMembers.length})
        </p>

        {initialMembers.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-surface px-4 py-6 text-center">
            <p className="font-sans text-sm text-text-3">No members yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
            {initialMembers.map((m, i) => (
              <div
                key={m.memberId}
                style={{
                  borderBottom:
                    i < initialMembers.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                }}
              >
                <MemberRow member={m} onRemoved={() => router.refresh()} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member */}
      {eligibleUsers.length > 0 && (
        <div>
          <p
            className="mb-2 font-sans font-semibold uppercase text-text-3"
            style={{ fontSize: 11, letterSpacing: "0.14em" }}
          >
            Add member
          </p>
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="">Select a user…</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addMember}
              disabled={!selectedUserId || adding}
              className={cn(
                "rounded-full bg-accent px-4 py-2 font-sans text-sm font-semibold text-bg transition-opacity",
                (!selectedUserId || adding) && "opacity-50",
              )}
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
          {addError && (
            <p className="mt-1.5 font-sans text-sm text-[#C77575]">{addError}</p>
          )}
        </div>
      )}
    </div>
  );
}
