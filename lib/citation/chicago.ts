// All citation output is in English regardless of the source material's language.
import { CitationMetadata, Author } from "./types";

function formatAuthorChicago(author: Author, first: boolean): string {
  if (!author.firstName) return author.lastName;
  if (first) return `${author.lastName}, ${author.firstName}`;
  return `${author.firstName} ${author.lastName}`;
}

function formatAuthorsChicago(authors: Author[]): string {
  if (!authors.length) return "Unknown Author";
  if (authors.length === 1) return formatAuthorChicago(authors[0], true);
  if (authors.length <= 3) {
    const [first, ...rest] = authors;
    return `${formatAuthorChicago(first, true)}, ${rest.map((a: any) => formatAuthorChicago(a, false)).join(", ")}`;
  }
  return `${formatAuthorChicago(authors[0], true)}, et al.`;
}

function hasUsableAuthors(authors: Author[]): boolean {
  return authors.some((a) => a.lastName.trim().toLowerCase() !== "unknown");
}

export function formatChicago(meta: CitationMetadata): string {
  const authors = formatAuthorsChicago([...meta.authors]);
  const year = meta.year ?? "n.d.";

  if (meta.sourceType === "report") {
    let citation = `${authors}. *${meta.title}*.`;
    if (meta.publisher) citation += ` ${meta.publisher},`;
    citation += ` ${year}.`;
    if (meta.doi) citation += ` https://doi.org/${meta.doi}.`;
    else if (meta.url) citation += ` ${meta.url}.`;
    return citation;
  }

  if (meta.journal) {
    let citation = `${authors}. "${meta.title}." *${meta.journal}*`;
    if (meta.volume) citation += ` ${meta.volume}`;
    if (meta.issue) citation += `, no. ${meta.issue}`;
    citation += ` (${year})`;
    if (meta.pages) citation += `: ${meta.pages}`;
    citation += ".";
    if (meta.doi) citation += ` https://doi.org/${meta.doi}.`;
    return citation;
  }

  if (meta.sourceType === "website" || meta.url) {
    const site = meta.website ?? meta.publisher ?? "";
    const accessed = meta.accessDate ? ` Accessed ${meta.accessDate}.` : "";
    const url = meta.url ? ` ${meta.url}.` : "";
    const authorPrefix = hasUsableAuthors(meta.authors) ? `${authors}. ` : "";
    return `${authorPrefix}"${meta.title}." ${site ? `*${site}*. ` : ""}${year}.${url}${accessed}`;
  }

  let citation = `${authors}. *${meta.title}*.`;
  if (meta.city && meta.publisher) citation += ` ${meta.city}: ${meta.publisher},`;
  else if (meta.publisher) citation += ` ${meta.publisher},`;
  citation += ` ${year}.`;
  if (meta.doi) citation += ` https://doi.org/${meta.doi}.`;
  return citation;
}
