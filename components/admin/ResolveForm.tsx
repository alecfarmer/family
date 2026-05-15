"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";

export function ResolveForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/help-requests/${requestId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved_notes: notes || undefined }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Something went wrong");
        return;
      }

      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional resolution notes…"
        className={cn(
          "w-full resize-none rounded-lg border border-border bg-surface px-3 py-2",
          "font-sans text-sm text-text placeholder:text-text-3",
          "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40",
        )}
      />
      {error && (
        <p className="text-xs text-[#C77575]">{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-success/15 px-4 py-2 font-sans text-sm font-medium text-success disabled:opacity-60"
      >
        {isPending ? "Marking resolved…" : "Mark resolved"}
      </button>
    </form>
  );
}
