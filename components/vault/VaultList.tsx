"use client";

import { useState } from "react";
import { CategoryPills } from "./CategoryPills";
import { CredentialRow, type CredentialRowData } from "./CredentialRow";

type VaultListProps = {
  credentials: (CredentialRowData & { category: string })[];
  categories: string[];
};

export function VaultList({ credentials, categories }: VaultListProps) {
  const [selected, setSelected] = useState("All");

  const filtered =
    selected === "All"
      ? credentials
      : credentials.filter((c) => c.category === selected);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Pinned pills */}
      <div className="px-4 pt-3 pb-2">
        <CategoryPills
          categories={categories}
          selected={selected}
          onChange={setSelected}
        />
      </div>

      {/* Scrollable list */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="10"
                width="18"
                height="11"
                rx="2"
                stroke="var(--color-text-3)"
                strokeWidth="1.6"
              />
              <path
                d="M7 10V7a5 5 0 0 1 10 0v3"
                stroke="var(--color-text-3)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <p className="font-sans text-[14px] text-text-3">
              No credentials in this category
            </p>
          </div>
        ) : (
          filtered.map((cred) => (
            <CredentialRow key={cred.id} credential={cred} />
          ))
        )}
      </div>
    </div>
  );
}
