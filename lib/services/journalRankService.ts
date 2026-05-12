/**
 * Fetches the best Scimago quartile for a journal name.
 *
 * Returns 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'NA'.
 * 'NA' is returned when no match is found, the network call fails, or no
 * quartile data is listed for the journal.
 *
 * Results are cached in a module-level Map so repeated lookups for the same
 * journal name skip the HTTP call entirely.
 */

import * as cheerio from "cheerio";
import { JournalRank } from "@/lib/citation/types";

// ── Types ───────────────────────────────────────────────────────────────────

export type ScimagoRank = "Q1" | "Q2" | "Q3" | "Q4" | "NA";

// ── Cache ───────────────────────────────────────────────────────────────────

const rankCache = new Map<string, ScimagoRank>();

// Fallback for journals we know are ranked but can fail live scraping due to
// anti-bot protections or temporary network blocks.
const rankOverrides: Record<string, ScimagoRank> = {
  "discover sustainability": "Q1",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const QUARTILE_PRIORITY: Record<string, number> = { Q1: 4, Q2: 3, Q3: 2, Q4: 1 };

function bestQuartile(matches: string[]): ScimagoRank {
  let best: ScimagoRank = "NA";
  let bestScore = 0;
  for (const q of matches) {
    const score = QUARTILE_PRIORITY[q] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = q as ScimagoRank;
    }
  }
  return best;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getJournalRank(journalName: string): Promise<ScimagoRank> {
  if (!journalName?.trim()) return "NA";

  const key = journalName.toLowerCase().trim();

  if (rankOverrides[key]) {
    rankCache.set(key, rankOverrides[key]);
    return rankOverrides[key];
  }

  if (rankCache.has(key)) return rankCache.get(key)!;

  try {
    const url = `https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(
      journalName
    )}&tip=jou&clean=0`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      rankCache.set(key, "NA");
      return "NA";
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Scimago search results render each journal inside a <div class="search_results">
    // Each row is a <tr> inside a <table class="resultstable">.
    // Quartile badges appear as <span> elements with text Q1–Q4.
    const found: string[] = [];

    // Strategy 1: look for explicit Q-badge spans / text in the results section
    $(".search_results, .resultstable, table").find("*").each((_, el) => {
      const text = $(el).text().trim();
      if (/^Q[1-4]$/.test(text)) {
        found.push(text);
      }
    });

    // Strategy 2: scan the entire HTML for Scimago quartile badge patterns
    if (!found.length) {
      const matches = html.matchAll(/\bQ([1-4])\b/g);
      for (const m of matches) {
        found.push(`Q${m[1]}`);
      }
    }

    const rank = bestQuartile(found);
    rankCache.set(key, rank);
    return rank;
  } catch {
    rankCache.set(key, "NA");
    return "NA";
  }
}

/**
 * Converts a ScimagoRank to the JournalRank DB enum value.
 * 'NA' becomes undefined (not persisted).
 */
export function scimagoRankToJournalRank(rank: ScimagoRank): JournalRank | undefined {
  if (rank === "NA") return undefined;
  return rank as JournalRank;
}
