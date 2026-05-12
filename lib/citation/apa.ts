// All citation output is in English regardless of the source material's language.
import { CitationMetadata, Author } from "./types";

function formatAuthorAPA(author: Author): string {
  if (!author.firstName) return author.lastName;
  const initials = author.firstName
    .split(/\s+/)
    .map((n: any) => n.charAt(0).toUpperCase() + ".")
    .join(" ");
  return `${author.lastName}, ${initials}`;
}

function formatAuthorsAPA(authors: Author[]): string {
  if (!authors.length) return "Unknown Author";
  if (authors.length === 1) return formatAuthorAPA(authors[0]);
  if (authors.length === 2)
    return `${formatAuthorAPA(authors[0])}, & ${formatAuthorAPA(authors[1])}`;
  if (authors.length <= 20) {
    const last = authors.pop()!;
    const formatted = authors.map(formatAuthorAPA).join(", ");
    return `${formatted}, & ${formatAuthorAPA(last)}`;
  }
  const first19 = authors.slice(0, 19).map(formatAuthorAPA).join(", ");
  return `${first19}, ... ${formatAuthorAPA(authors[authors.length - 1])}`;
}

function hasUsableAuthors(authors: Author[]): boolean {
  return authors.some((a) => a.lastName.trim().toLowerCase() !== "unknown");
}

export function formatAPA(meta: CitationMetadata): string {
  const authors = formatAuthorsAPA([...meta.authors]);
  const year = meta.year ? `(${meta.year})` : "(n.d.)";
  const title = meta.title;

  // Technical / institutional report
  if (meta.sourceType === "report") {
    let citation = `${authors}. ${year}. *${title}*`;
    if (meta.publisher) citation += `. ${meta.publisher}.`;
    else citation += ".";
    if (meta.doi) citation += ` https://doi.org/${meta.doi}`;
    else if (meta.url) citation += ` ${meta.url}`;
    return citation;
  }

  if (meta.sourceType === "website" || (!meta.journal && meta.url)) {
    const site = meta.website ?? meta.publisher ?? "Website";
    const date = meta.accessDate ? ` Retrieved ${meta.accessDate}, from` : "";
    const url = meta.url ? ` ${meta.url}` : "";
    const authorPrefix = hasUsableAuthors(meta.authors) ? `${authors}. ` : "";
    return `${authorPrefix}${year}. *${title}*. ${site}.${date}${url}`;
  }

  if (meta.journal) {
    let citation = `${authors}. ${year}. ${title}. *${meta.journal}*`;
    if (meta.volume) citation += `, *${meta.volume}*`;
    if (meta.issue) citation += `(${meta.issue})`;
    if (meta.pages) citation += `, ${meta.pages}`;
    citation += ".";
    if (meta.doi) citation += ` https://doi.org/${meta.doi}`;
    return citation;
  }

  if (meta.publisher) {
    let citation = `${authors}. ${year}. *${title}*`;
    if (meta.edition) citation += ` (${meta.edition} ed.)`;
    citation += `. ${meta.publisher}.`;
    if (meta.doi) citation += ` https://doi.org/${meta.doi}`;
    else if (meta.url) citation += ` ${meta.url}`;
    return citation;
  }

  return `${authors}. ${year}. ${title}.${meta.doi ? ` https://doi.org/${meta.doi}` : ""}`;
}
