// All citation output is in English regardless of the source material's language.
import { CitationMetadata, Author } from "./types";

function formatAuthorIEEE(author: Author): string {
  if (!author.firstName) return author.lastName;
  const initials = author.firstName
    .split(/\s+/)
    .map((n: any) => n.charAt(0).toUpperCase() + ".")
    .join(" ");
  return `${initials} ${author.lastName}`;
}

function formatAuthorsIEEE(authors: Author[]): string {
  if (!authors.length) return "Unknown Author";
  if (authors.length === 1) return formatAuthorIEEE(authors[0]);
  if (authors.length === 2)
    return `${formatAuthorIEEE(authors[0])} and ${formatAuthorIEEE(authors[1])}`;
  const last = formatAuthorIEEE(authors[authors.length - 1]);
  const rest = authors.slice(0, -1).map(formatAuthorIEEE).join(", ");
  return `${rest}, and ${last}`;
}

function hasUsableAuthors(authors: Author[]): boolean {
  return authors.some((a) => a.lastName.trim().toLowerCase() !== "unknown");
}

export function formatIEEE(meta: CitationMetadata, refNumber = 1): string {
  const authors = formatAuthorsIEEE([...meta.authors]);
  const title = `"${meta.title}"`;

  if (meta.sourceType === "report") {
    let citation = `[${refNumber}] ${authors}, *${meta.title}*`;
    if (meta.publisher) citation += `. ${meta.publisher}`;
    if (meta.year) citation += `, ${meta.year}`;
    citation += ".";
    if (meta.doi) citation += ` doi: ${meta.doi}.`;
    else if (meta.url) citation += ` [Online]. Available: ${meta.url}.`;
    return citation;
  }

  if (meta.journal) {
    let citation = `[${refNumber}] ${authors}, ${title}, *${meta.journal}*`;
    if (meta.volume) citation += `, vol. ${meta.volume}`;
    if (meta.issue) citation += `, no. ${meta.issue}`;
    if (meta.pages) citation += `, pp. ${meta.pages}`;
    if (meta.year) citation += `, ${meta.year}`;
    citation += ".";
    if (meta.doi) citation += ` doi: ${meta.doi}.`;
    return citation;
  }

  if (meta.sourceType === "website" || meta.url) {
    const site = meta.website ?? meta.publisher ?? "";
    const accessed = meta.accessDate ? ` Accessed: ${meta.accessDate}.` : "";
    const url = meta.url ? ` [Online]. Available: ${meta.url}.` : "";
    const authorPrefix = hasUsableAuthors(meta.authors) ? `${authors}, ` : "";
    return `[${refNumber}] ${authorPrefix}${title}, ${site ? `*${site}*, ` : ""}${meta.year ?? "n.d."}.${url}${accessed}`;
  }

  let citation = `[${refNumber}] ${authors}, *${meta.title}*`;
  if (meta.publisher) citation += `. ${meta.publisher}`;
  if (meta.year) citation += `, ${meta.year}`;
  citation += ".";
  if (meta.doi) citation += ` doi: ${meta.doi}.`;
  return citation;
}
