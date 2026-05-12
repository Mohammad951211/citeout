// All citation output is in English regardless of the source material's language.
import { CitationMetadata, Author } from "./types";

function formatAuthorVancouver(author: Author): string {
  if (!author.firstName) return author.lastName;
  const initials = author.firstName
    .split(/\s+/)
    .map((n: any) => n.charAt(0).toUpperCase())
    .join("");
  return `${author.lastName} ${initials}`;
}

function formatAuthorsVancouver(authors: Author[]): string {
  if (!authors.length) return "Unknown Author";
  if (authors.length <= 6) return authors.map(formatAuthorVancouver).join(", ");
  return authors.slice(0, 6).map(formatAuthorVancouver).join(", ") + ", et al.";
}

function hasUsableAuthors(authors: Author[]): boolean {
  return authors.some((a) => a.lastName.trim().toLowerCase() !== "unknown");
}

export function formatVancouver(meta: CitationMetadata, refNumber = 1): string {
  const authors = formatAuthorsVancouver([...meta.authors]);

  if (meta.sourceType === "report") {
    let citation = `${refNumber}. ${authors}. ${meta.title}.`;
    if (meta.publisher) citation += ` ${meta.publisher};`;
    if (meta.year) citation += ` ${meta.year}.`;
    if (meta.doi) citation += ` doi:${meta.doi}.`;
    else if (meta.url) citation += ` Available from: ${meta.url}.`;
    return citation;
  }

  if (meta.journal) {
    let citation = `${refNumber}. ${authors}. ${meta.title}. ${meta.journal}.`;
    if (meta.year) citation += ` ${meta.year}`;
    if (meta.volume) citation += `;${meta.volume}`;
    if (meta.issue) citation += `(${meta.issue})`;
    if (meta.pages) citation += `:${meta.pages}`;
    citation += ".";
    if (meta.doi) citation += ` doi:${meta.doi}.`;
    return citation;
  }

  if (meta.sourceType === "website" || meta.url) {
    const accessed = meta.accessDate ? ` [cited ${meta.accessDate}]` : "";
    const url = meta.url ? ` Available from: ${meta.url}` : "";
    const authorPrefix = hasUsableAuthors(meta.authors) ? `${authors}. ` : "";
    return `${refNumber}. ${authorPrefix}${meta.title} [Internet]. ${meta.publisher ?? ""}. ${meta.year ?? "n.d."}${accessed}.${url}`;
  }

  let citation = `${refNumber}. ${authors}. ${meta.title}.`;
  if (meta.edition) citation += ` ${meta.edition} ed.`;
  if (meta.city && meta.publisher) citation += ` ${meta.city}: ${meta.publisher};`;
  else if (meta.publisher) citation += ` ${meta.publisher};`;
  if (meta.year) citation += ` ${meta.year}.`;
  if (meta.doi) citation += ` doi:${meta.doi}.`;
  return citation;
}
