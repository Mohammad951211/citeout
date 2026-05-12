// All citation output is in English regardless of the source material's language.
import { CitationMetadata, Author } from "./types";

function formatAuthorMLA(author: Author, first: boolean): string {
  if (!author.firstName) return author.lastName;
  if (first) return `${author.lastName}, ${author.firstName}`;
  return `${author.firstName} ${author.lastName}`;
}

function formatAuthorsMLA(authors: Author[]): string {
  if (!authors.length) return "Unknown Author";
  if (authors.length === 1) return formatAuthorMLA(authors[0], true);
  if (authors.length === 2)
    return `${formatAuthorMLA(authors[0], true)}, and ${formatAuthorMLA(authors[1], false)}`;
  if (authors.length === 3)
    return `${formatAuthorMLA(authors[0], true)}, ${formatAuthorMLA(authors[1], false)}, and ${formatAuthorMLA(authors[2], false)}`;
  return `${formatAuthorMLA(authors[0], true)}, et al.`;
}

function hasUsableAuthors(authors: Author[]): boolean {
  return authors.some((a) => a.lastName.trim().toLowerCase() !== "unknown");
}

export function formatMLA(meta: CitationMetadata): string {
  const authors = formatAuthorsMLA([...meta.authors]);
  const title = `"${meta.title}"`;

  if (meta.sourceType === "report") {
    let citation = `${authors}. *${meta.title}*.`;
    if (meta.publisher) citation += ` ${meta.publisher},`;
    if (meta.year) citation += ` ${meta.year}.`;
    if (meta.url) citation += ` ${meta.url}.`;
    return citation;
  }

  if (meta.sourceType === "website" || (!meta.journal && meta.url)) {
    const site = meta.website ?? meta.publisher ?? "";
    const date = meta.year ?? "";
    const accessed = meta.accessDate ? ` Accessed ${meta.accessDate}.` : "";
    const url = meta.url ? ` ${meta.url}.` : "";
    const authorPrefix = hasUsableAuthors(meta.authors) ? `${authors}. ` : "";
    return `${authorPrefix}${title} ${site ? `*${site}*, ` : ""}${date}.${url}${accessed}`;
  }

  if (meta.journal) {
    let citation = `${authors}. ${title} *${meta.journal}*`;
    if (meta.volume) citation += `, vol. ${meta.volume}`;
    if (meta.issue) citation += `, no. ${meta.issue}`;
    if (meta.year) citation += `, ${meta.year}`;
    if (meta.pages) citation += `, pp. ${meta.pages}`;
    citation += ".";
    if (meta.doi) citation += ` doi:${meta.doi}.`;
    return citation;
  }

  let citation = `${authors}. *${meta.title}*.`;
  if (meta.edition) citation += ` ${meta.edition} ed.,`;
  if (meta.publisher) citation += ` ${meta.publisher},`;
  if (meta.year) citation += ` ${meta.year}.`;
  return citation;
}
