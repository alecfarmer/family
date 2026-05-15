"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { Badge } from "@/components/ui/Badge";

type UserRow = {
  id: string;
  full_name: string;
  role: "admin" | "member";
  created_at: string;
  household_ids: string[];
  household_names: string[];
};

type Props = {
  initial: UserRow[];
  households: { id: string; name: string }[];
  openNew: boolean;
};

export function UsersClient({ initial, households, openNew }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(openNew);

  return (
    <div className="px-4 pb-20 pt-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="font-display font-semibold text-text"
          style={{ fontSize: 26, letterSpacing: "0.01em" }}
        >
          Users
        </h1>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-full bg-accent px-4 py-2 font-sans text-sm font-semibold text-bg"
        >
          + Invite
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-surface px-4 py-10 text-center">
          <p className="font-sans text-sm text-text-3">No users yet.</p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-3 font-sans text-sm font-medium text-accent"
          >
            Invite the first user
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
          {initial.map((u, i) => (
            <div
              key={u.id}
              className="flex items-start gap-3 px-3.5 py-3"
              style={{
                borderBottom:
                  i < initial.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              {/* Avatar */}
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-bg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), #8a4f29)",
                  fontSize: 13,
                }}
              >
                {u.full_name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-sans text-sm font-medium text-text">
                    {u.full_name}
                  </span>
                  <Badge tone={u.role === "admin" ? "accent" : "neutral"}>
                    {u.role}
                  </Badge>
                </div>
                {u.household_names.length > 0 && (
                  <p className="mt-0.5 font-sans text-xs text-text-3">
                    {u.household_names.join(", ")}
                  </p>
                )}
                <p className="mt-0.5 font-sans text-xs text-text-3">
                  Joined{" "}
                  {new Date(u.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteUserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => router.refresh()}
        households={households}
      />
    </div>
  );
}
