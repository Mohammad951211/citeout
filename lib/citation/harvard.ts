// All citation output is in English regardless of the source material's language.
import { CitationMetadata, Author } from "./types";

function formatAuthorHarvard(author: Author): string {
  if (!author.firstName) return author.lastName;
  const initials = author.firstName
    .split(/\s+/)
    .map((n: any) => n.charAt(0).toUpperCase() + ".")
    .join("");
  return `${author.lastName}, ${initials}`;
}

function formatAuthorsHarvard(authors: Author[]): string {
  if (!authors.length) return "Unknown Author";
  if (authors.length === 1) return formatAuthorHarvard(authors[0]);
  if (authors.length === 2)
    return `${formatAuthorHarvard(authors[0])} and ${formatAuthorHarvard(authors[1])}`;
  const last = formatAuthorHarvard(authors[authors.length - 1]);
  const rest = authors.slice(0, -1).map(formatAuthorHarvard).join(", ");
  return `${rest} and ${last}`;
}

function hasUsableAuthors(authors: Author[]): boolean {
  return authors.some((a) => a.lastName.trim().toLowerCase() !== "unknown");
}

export function formatHarvard(meta: CitationMetadata): string {
  const authors = formatAuthorsHarvard([...meta.authors]);
  const year = meta.year ? `(${meta.year})` : "(n.d.)";

  if (meta.sourceType === "report") {
    let citation = `${authors} ${year} *${meta.title}*.`;
    if (meta.publisher) citation += ` ${meta.publisher}.`;
    if (meta.doi) citation += ` doi:${meta.doi}.`;
    else if (meta.url) citation += ` Available at: ${meta.url}.`;
    return citation;
  }

  if (meta.journal) {
    let citation = `${authors} ${year} '${meta.title}', *${meta.journal}*`;
    if (meta.volume) citation += `, ${meta.volume}`;
    if (meta.issue) citation += `(${meta.issue})`;
    if (meta.pages) citation += `, pp. ${meta.pages}`;
    citation += ".";
    if (meta.doi) citation += ` doi:${meta.doi}.`;
    return citation;
  }

  if (meta.sourceType === "website" || meta.url) {
    const site = meta.website ?? meta.publisher ?? "";
    const accessed = meta.accessDate ? ` [Accessed ${meta.accessDate}]` : "";
    const url = meta.url ? ` Available at: ${meta.url}${accessed}.` : ".";
    const authorPrefix = hasUsableAuthors(meta.authors) ? `${authors} ` : "";
    return `${authorPrefix}${year} *${meta.title}*. ${site}.${url}`;
  }

  let citation = `${authors} ${year} *${meta.title}*.`;
  if (meta.city && meta.publisher) citation += ` ${meta.city}: ${meta.publisher}.`;
  else if (meta.publisher) citation += ` ${meta.publisher}.`;
  if (meta.doi) citation += ` doi:${meta.doi}.`;
  return citation;
}
