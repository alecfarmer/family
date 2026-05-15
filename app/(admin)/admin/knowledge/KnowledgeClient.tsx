"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { KnowledgeForm } from "@/components/admin/KnowledgeForm";
import type { Tables } from "@/lib/supabase/types";
import type { HouseholdOption } from "@/components/admin/KnowledgeForm";

export type KnowledgeGroup = {
  householdId: string | null;
  householdName: string;
  entries: Tables<"knowledge_base">[];
};

export function KnowledgeClient({
  groups,
  households,
}: {
  groups: KnowledgeGroup[];
  households: HouseholdOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Tables<"knowledge_base"> | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this knowledge entry?")) return;
    setDeletingId(id);
    await fetch("/api/admin/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    router.refresh();
  }

  function onSaved() {
    setEditing(null);
    setAdding(false);
    router.refresh();
  }

  const hasEntries = groups.some((g) => g.entries.length > 0);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-accent px-3 py-2 font-sans text-sm font-medium text-bg"
        >
          + Add Entry
        </button>
      </div>

      {!hasEntries ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="font-sans text-sm text-text-2">
            No knowledge entries yet
          </div>
          <button
            onClick={() => setAdding(true)}
            className="mt-2 font-sans text-sm text-accent underline"
          >
            Add the first one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups
            .filter((g) => g.entries.length > 0)
            .map((g) => (
              <section key={g.householdId ?? "global"}>
                <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-text-3">
                  {g.householdName}
                </h2>
                <div className="flex flex-col gap-2">
                  {g.entries.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-[12px] border border-border bg-surface p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-sans text-sm font-medium text-text">
                            {e.title}
                          </div>
                          <p className="mt-1 line-clamp-2 font-sans text-xs text-text-2">
                            {e.content}
                          </p>
                          {e.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {e.tags.map((tag) => (
                                <Badge key={tag} tone="neutral">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => setEditing(e)}
                            className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-text-2 hover:bg-surface-elevated"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            className="rounded-lg border border-destructive/40 px-3 py-1.5 font-sans text-xs text-[#C77575] hover:bg-destructive/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {(adding || editing) && (
        <KnowledgeForm
          households={households}
          entry={editing}
          onSaved={onSaved}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
