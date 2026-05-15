"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

type Household = { id: string; name: string };

type InviteUserFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  households: Household[];
};

export function InviteUserForm({ open, onClose, onSaved, households }: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setFullName("");
      setRole("member");
      setSelectedIds([]);
      setError(null);
      setTimeout(() => emailRef.current?.focus(), 80);
    }
  }, [open]);

  function toggleHousehold(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role, householdIds: selectedIds }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg overflow-y-auto rounded-t-[20px] border border-border bg-surface-elevated px-5 pb-10 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-base font-semibold text-text">Invite User</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-3 transition-colors hover:text-text"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
              Email
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              required
              className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
              Full Name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First Last"
              required
              className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
              Role
            </label>
            <div className="flex gap-2">
              {(["member", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex-1 rounded-full border py-2 font-sans text-sm font-medium transition-colors",
                    role === r
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-text-2",
                  )}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {households.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
                Households
              </label>
              <div className="flex flex-wrap gap-2">
                {households.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHousehold(h.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-sans text-xs font-medium transition-colors",
                      selectedIds.includes(h.id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-text-2",
                    )}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="font-sans text-sm text-[#C77575]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !fullName.trim()}
            className={cn(
              "mt-1 rounded-full py-3 font-sans text-sm font-semibold transition-opacity",
              "bg-accent text-bg",
              (loading || !email.trim() || !fullName.trim()) && "opacity-50",
            )}
          >
            {loading ? "Sending invite…" : "Send Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}
