"use client";

import { useState } from "react";
import { Copy, Check, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { JournalRank, CitationStyle, RankSource } from "@/lib/citation/types";
import { cn } from "@/lib/utils/cn";

interface CitationOutputProps {
  citation: string;
  style: CitationStyle;
  journalRank?: JournalRank;
  rankSource?: RankSource;
  className?: string;
  canMoveToLibrary?: boolean;
  inLibrary?: boolean;
  movingToLibrary?: boolean;
  onMoveToLibrary?: () => void;
}

const rankSourceLabel: Record<RankSource, string> = {
  MANUAL: "Manual",
  DETECTED_FROM_PAGE: "Detected from page",
  INFERRED_FROM_JOURNAL: "Inferred from journal",
};

const rankVariant: Record<JournalRank, "q1" | "q2" | "q3" | "q4" | "unranked"> = {
  Q1: "q1",
  Q2: "q2",
  Q3: "q3",
  Q4: "q4",
  UNRANKED: "unranked",
};

export function CitationOutput({
  citation,
  style,
  journalRank,
  rankSource,
  className,
  canMoveToLibrary,
  inLibrary,
  movingToLibrary,
  onMoveToLibrary,
}: CitationOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            {style}
          </span>
          {journalRank && (
            <Badge variant={rankVariant[journalRank]}>{journalRank}</Badge>
          )}
          {journalRank && rankSource && (
            <span className="text-[11px] text-[var(--text-secondary)]">
              Rank source: {rankSourceLabel[rankSource]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canMoveToLibrary && onMoveToLibrary && (
            <button
              onClick={onMoveToLibrary}
              disabled={inLibrary || movingToLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FolderPlus size={13} />
              {inLibrary ? "In Library" : movingToLibrary ? "Moving..." : "Move to Library"}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          >
            {copied ? (
              <>
                <Check size={13} className="text-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      {/* Citation text */}
      <div className="p-4">
        <p className="citation-output text-[var(--text-primary)] whitespace-pre-wrap break-words">
          {citation}
        </p>
      </div>
    </div>
  );
}
