import { CitationMetadata, Author } from "@/lib/citation/types";
import mammoth from "mammoth";

export async function parseDOCX(buffer: Buffer): Promise<CitationMetadata> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value ?? "";

  const lines = text
    .split("\n")
    .map((l: any) => l.trim())
    .filter(Boolean);

  // Look for DOI in text
  const doiMatch = text.match(/\b(10\.\d{4,}\/[^\s"<>]+)/i);
  if (doiMatch) {
    try {
      const { parseDOI } = await import("./doi");
      return await parseDOI(doiMatch[1]);
    } catch {
      // Continue with text extraction
    }
  }

  const title = lines[0] ?? "Unknown Title";

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch?.[0];

  const authors: Author[] = [];
  const authorMatch =
    text.match(/Authors?:\s*([^\n]+)/i) ?? text.match(/By\s+([A-Z][a-z]+[^\n]+)/);
  if (authorMatch) {
    const names = authorMatch[1].split(/[,;]\s*/);
    names.forEach((name: any) => {
      const words = name.trim().split(/\s+/);
      if (words.length >= 2) {
        authors.push({
          firstName: words.slice(0, -1).join(" "),
          lastName: words[words.length - 1],
        });
      }
    });
  }

  // Try to get journal
  const journalMatch = text.match(/Journal[:\s]+([^\n]+)/i);
  const journal = journalMatch?.[1]?.trim();

  return {
    title,
    authors: authors.length ? authors : [{ lastName: "Unknown" }],
    year,
    journal,
    sourceType: journal ? "journal" : "unknown",
  };
}
