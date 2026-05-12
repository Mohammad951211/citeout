"use client";

import { CitationStyle } from "@/lib/citation/types";

const STYLES: { value: CitationStyle; label: string; description: string }[] = [
  { value: "APA", label: "APA 7th", description: "American Psychological Association" },
  { value: "MLA", label: "MLA 9th", description: "Modern Language Association" },
  { value: "CHICAGO", label: "Chicago 17th", description: "Chicago Manual of Style" },
  { value: "IEEE", label: "IEEE", description: "Institute of Electrical and Electronics Engineers" },
  { value: "HARVARD", label: "Harvard", description: "Harvard Referencing System" },
  { value: "VANCOUVER", label: "Vancouver", description: "Vancouver/NLM Style" },
];

interface StyleSelectorProps {
  value: CitationStyle;
  onChange: (style: CitationStyle) => void;
}

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
        Citation Style
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STYLES.map((style) => (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={`p-3 rounded-md border text-left transition-colors duration-150 ${
              value === style.value
                ? "border-brand bg-brand/5 text-brand"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-brand/40"
            }`}
          >
            <div className="font-medium text-sm">{style.label}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
              {style.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
