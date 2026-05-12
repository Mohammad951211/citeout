import { CitationMetadata, Author } from "@/lib/citation/types";

// ── Text extraction ────────────────────────────────────────────────────────

async function extractPagesFromPDF(buffer: Buffer): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { getDocument } = (await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  )) as any;

  const data = new Uint8Array(buffer);
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>)
      .map((item: any) => item.str ?? "")
      .join(" ");
    pages.push(pageText);
  }

  return pages;
}

// ── DOI detection helpers ──────────────────────────────────────────────────

/**
 * Finds the document's own DOI (not a cited-reference DOI).
 *
 * A DOI is treated as the document's own identifier only when ALL of:
 *   1. It appears on page 1 or 2 of the document.
 *   2. It is preceded by a label: "DOI:", "doi:", "https://doi.org/", "dx.doi.org/".
 *   3. It is NOT immediately preceded by a numbered reference marker
 *      ([1], [2], 1., 2., etc.) on the same line or the preceding line.
 */
function findDocumentDOI(firstTwoPageText: string): string | null {
  const lines = firstTwoPageText.split(/\n|\r/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : "";

    // Reject if this line or the preceding line looks like a reference entry
    const refPattern = /^\s*[\[\(]?\d{1,3}[\]\)]?\s*[A-Z]/;
    if (refPattern.test(line) || refPattern.test(prevLine)) continue;

    // Match DOI with explicit label prefix
    const labeledDoi =
      line.match(
        /(?:doi[:\s]+|https?:\/\/(?:dx\.)?doi\.org\/)[\s]*(10\.\d{4,}\/[^\s"<>]+)/i,
      );
    if (labeledDoi) {
      return labeledDoi[1].replace(/[.,;]+$/, "");
    }
  }

  return null;
}

// ── Structural extraction helpers ──────────────────────────────────────────

function extractTitle(coverText: string): string {
  const lines = coverText
    .split(/\s{2,}|\n/)
    .map((l: any) => l.trim())
    .filter(
      (l) =>
        l.length > 10 &&
        l.length < 250 &&
        !l.match(/^(abstract|introduction|keywords?|table of contents|prepared by|authors?|written by|date:|march|january|february|april|may|june|july|august|september|october|november|december|\d{4})/i) &&
        !l.match(/^(university|lab|institute|center|department|faculty|school)/i),
    );
  return lines[0] ?? "Unknown Title";
}

function extractAuthors(coverText: string): Author[] {
  const authors: Author[] = [];

  // Patterns like "Prepared by: Name1, Name2" or "Authors: Name"
  const labelMatch = coverText.match(
    /(?:prepared by|authors?|written by)[:\s]+([^\n]+)/i,
  );
  if (labelMatch) {
    const raw = labelMatch[1].trim();
    raw.split(/[,;&]|\band\b/i).forEach((part: any) => {
      const name = part.trim().replace(/\s+/g, " ");
      if (name.length < 3) return;
      const words = name.split(/\s+/);
      if (words.length >= 2) {
        authors.push({
          firstName: words.slice(0, -1).join(" "),
          lastName: words[words.length - 1],
        });
      }
    });
  }

  return authors;
}

function extractInstitution(coverText: string): string | undefined {
  const m = coverText.match(
    /([A-Z][^\n]*(?:university|lab(?:oratory)?|institute|center|centre|department)[^\n]*)/i,
  );
  return m ? m[1].trim().replace(/\s+/g, " ").substring(0, 120) : undefined;
}

function extractYear(text: string): string | undefined {
  // Prefer dates in the format "Month YYYY" or plain YYYY in plausible range
  const full = text.match(
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
  );
  if (full) return full[1];
  const plain = text.match(/\b(20\d{2}|19\d{2})\b/);
  return plain?.[1];
}

function hasAbstractSection(text: string): boolean {
  return /\babstract\b/i.test(text);
}

/**
 * Heuristically detects if this PDF is a technical report (not a journal article).
 * Conditions: no journal-like metadata, institution name on cover page, abstract present.
 */
function isReport(
  fullText: string,
  coverText: string,
  journal: string | undefined,
): boolean {
  if (journal) return false;
  if (!hasAbstractSection(fullText)) return false;
  if (!extractInstitution(coverText)) return false;
  // Reject if it looks like a conference paper (has proceedings-style text)
  if (/\bproceedings\b|\bconference\b/i.test(coverText)) return false;
  return true;
}

// ── Main export ────────────────────────────────────────────────────────────

export async function parsePDF(buffer: Buffer): Promise<CitationMetadata> {
  const pages = await extractPagesFromPDF(buffer);
  const fullText = pages.join("\n");
  const coverText = pages.slice(0, 2).join("\n");

  // ── Strict DOI detection: pages 1-2 only, with label, not in references ──
  const documentDoi = findDocumentDOI(coverText);
  if (documentDoi) {
    try {
      const { parseDOI } = await import("./doi");
      return await parseDOI(documentDoi);
    } catch {
      // DOI lookup failed; continue with structural extraction
    }
  }

  // ── Journal-article patterns ─────────────────────────────────────────────
  const journalPatterns = [
    /Journal of\s+[A-Z][^\n.]+/i,
    /Proceedings of\s+[A-Z][^\n.]+/i,
    /Published in:\s*([^\n]+)/i,
    /IEEE Transactions on\s+[A-Z][^\n.]+/i,
  ];

  let journal: string | undefined;
  for (const pattern of journalPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      journal = match[0].substring(0, 100);
      break;
    }
  }

  // ── Report detection and structural extraction ────────────────────────────
  if (isReport(fullText, coverText, journal)) {
    const title = extractTitle(coverText);
    const authors = extractAuthors(coverText);
    const institution = extractInstitution(coverText);
    const year = extractYear(coverText);

    // Extract URL from the cover (institution website)
    const urlMatch = coverText.match(/https?:\/\/[^\s"<>]+/);
    const url = urlMatch?.[0];

    return {
      title,
      authors: authors.length ? authors : [{ lastName: "Unknown" }],
      year,
      publisher: institution,
      url,
      sourceType: "report",
    };
  }

  // ── Journal article extraction ────────────────────────────────────────────
  const lines = fullText
    .split("\n")
    .map((l: any) => l.trim())
    .filter(Boolean);

  const titleLine =
    lines.find(
      (l) =>
        l.length > 10 &&
        l.length < 200 &&
        !l.match(/^(abstract|introduction|keywords?)/i),
    ) ??
    lines[0] ??
    "Unknown Title";

  const year = extractYear(fullText);

  const authors: Author[] = [];
  const authorPatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:,?\s+(?:et al\.))?/,
    /Authors?:\s*([^\n]+)/i,
    /By\s+([^\n]+)/i,
  ];

  for (const pattern of authorPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const names = match[1].split(/[,;](?:\s+(?:and\s+)?)?/);
      names.forEach((name: any) => {
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
          authors.push({
            firstName: words.slice(0, -1).join(" "),
            lastName: words[words.length - 1],
          });
        }
      });
      if (authors.length) break;
    }
  }

  return {
    title: titleLine,
    authors: authors.length ? authors : [{ lastName: "Unknown" }],
    year,
    journal,
    sourceType: journal ? "journal" : "unknown",
  };
}
