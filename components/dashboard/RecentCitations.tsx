import { Badge } from "@/components/ui/Badge";
import { JournalRank } from "@/lib/citation/types";
import Link from "next/link";
import { Clock } from "lucide-react";

interface Citation {
  id: string;
  output: string;
  style: string;
  sourceType: string;
  journalRank?: string | null;
  createdAt: string;
}

interface RecentCitationsProps {
  citations: Citation[];
}

const rankVariant: Record<string, "q1" | "q2" | "q3" | "q4" | "unranked"> = {
  Q1: "q1", Q2: "q2", Q3: "q3", Q4: "q4", UNRANKED: "unranked",
};

export function RecentCitations({ citations }: RecentCitationsProps) {
  if (!citations.length) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-10 bg-[var(--surface)] text-center">
        <Clock size={28} className="mx-auto mb-3 text-[var(--text-secondary)]" />
        <p className="text-sm text-[var(--text-secondary)]">No citations yet.</p>
        <Link
          href="/cite"
          className="mt-3 inline-flex text-sm text-brand hover:underline"
        >
          Generate your first citation →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {citations.map((c) => (
        <div
          key={c.id}
          className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface)] hover:border-brand/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default">{c.style}</Badge>
            <Badge variant="default">{c.sourceType}</Badge>
            {c.journalRank && (
              <Badge variant={rankVariant[c.journalRank] ?? "unranked"}>{c.journalRank}</Badge>
            )}
            <span className="ml-auto text-xs text-[var(--text-secondary)]">
              {new Date(c.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="citation-output text-sm text-[var(--text-primary)] line-clamp-2">
            {c.output}
          </p>
        </div>
      ))}
    </div>
  );
}
