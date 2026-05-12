"use client";

import { JournalRank } from "@/lib/citation/types";

const RANKS: { value: JournalRank; label: string; color: string }[] = [
  { value: "Q1", label: "Q1", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  { value: "Q2", label: "Q2", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  { value: "Q3", label: "Q3", color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
  { value: "Q4", label: "Q4", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
  { value: "UNRANKED", label: "Unranked", color: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
];

interface RankSelectorProps {
  value: JournalRank | undefined;
  onChange: (rank: JournalRank | undefined) => void;
}

export function RankSelector({ value, onChange }: RankSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
        Journal Rank <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {RANKS.map((rank) => (
          <button
            key={rank.value}
            type="button"
            onClick={() => onChange(value === rank.value ? undefined : rank.value)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-150 ${
              value === rank.value
                ? rank.color + " ring-2 ring-offset-1 ring-current/30"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
            }`}
          >
            {rank.label}
          </button>
        ))}
      </div>
    </div>
  );
}
