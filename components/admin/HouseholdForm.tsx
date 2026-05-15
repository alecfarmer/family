"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

type HouseholdFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: { id: string; name: string; address: string | null } | null;
};

export function HouseholdForm({ open, onClose, onSaved, initial }: HouseholdFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset fields when opening for a new entry
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setAddress(initial?.address ?? "");
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const method = initial ? "PUT" : "POST";
      const url = initial
        ? `/api/admin/households?id=${initial.id}`
        : "/api/admin/households";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: address || undefined }),
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full max-w-lg rounded-t-[20px] border border-border bg-surface-elevated px-5 pb-10 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-base font-semibold text-text">
            {initial ? "Edit Household" : "New Household"}
          </h2>
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
              Name
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Parents' House"
              required
              className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">
              Address <span className="normal-case tracking-normal text-text-3">(optional)</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Anytown, SC"
              rows={3}
              className="rounded-[10px] border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p className="font-sans text-sm text-[#C77575]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className={cn(
              "mt-1 rounded-full py-3 font-sans text-sm font-semibold transition-opacity",
              "bg-accent text-bg",
              (loading || !name.trim()) && "opacity-50",
            )}
          >
            {loading ? "Saving…" : initial ? "Save Changes" : "Create Household"}
          </button>
        </form>
      </div>
    </div>
  );
}
