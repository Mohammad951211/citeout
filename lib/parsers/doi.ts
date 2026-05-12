import { CitationMetadata, Author } from "@/lib/citation/types";
import * as cheerio from "cheerio";

// ── Types ──────────────────────────────────────────────────────────────────

interface CrossRefAuthor {
  given?: string;
  family: string;
  sequence?: string;
}

interface CrossRefMessage {
  title?: string[];
  author?: CrossRefAuthor[];
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  publisher?: string;
  DOI?: string;
  URL?: string;
  type?: string;
}

interface OpenAlexAuthorship {
  author?: { display_name?: string };
}

interface OpenAlexWork {
  title?: string;
  doi?: string;
  publication_year?: number;
  authorships?: OpenAlexAuthorship[];
  primary_location?: { source?: { display_name?: string } };
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  host_venue?: { display_name?: string };
  publisher?: string;
}

interface S2Author {
  name: string;
}

interface S2Paper {
  title?: string;
  year?: number;
  authors?: S2Author[];
  externalIds?: { DOI?: string };
  journal?: { name?: string; volume?: string; pages?: string };
  publicationVenue?: { name?: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CROSSREF_EMAIL =
  process.env.CROSSREF_API_EMAIL ?? "contact@citeout.com";

const BOT_UA = `CiteOut/1.0 (mailto:${CROSSREF_EMAIL})`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function is429(err: unknown): boolean {
  return err instanceof Error && err.message.includes("429");
}

// ── Per-API fetchers ───────────────────────────────────────────────────────

async function fetchFromCrossRef(doi: string): Promise<CitationMetadata> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": BOT_UA },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`CrossRef API returned ${res.status} for DOI: ${doi}`);
  }

  const data = (await res.json()) as { message: CrossRefMessage };
  const msg = data.message;

  const authors: Author[] = (msg.author ?? []).map((a: any) => ({
    firstName: a.given,
    lastName: a.family,
  }));

  const dateParts =
    msg["published-print"]?.["date-parts"]?.[0] ??
    msg["published-online"]?.["date-parts"]?.[0];
  const year = dateParts?.[0]?.toString();

  const journal = msg["container-title"]?.[0];

  return {
    title: msg.title?.[0] ?? "Unknown Title",
    authors: authors.length ? authors : [{ lastName: "Unknown" }],
    year,
    journal,
    volume: msg.volume,
    issue: msg.issue,
    pages: msg.page,
    publisher: msg.publisher,
    doi,
    url: msg.URL,
    sourceType: journal ? "journal" : "unknown",
  };
}

async function fetchFromOpenAlex(doi: string): Promise<CitationMetadata> {
  // OpenAlex accepts bare DOI in the path
  const url = `https://api.openalex.org/works/doi:${doi}`;
  const res = await fetch(url, {
    headers: { "User-Agent": BOT_UA },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`OpenAlex API returned ${res.status} for DOI: ${doi}`);
  }

  const work = (await res.json()) as OpenAlexWork;

  if (!work.title) {
    throw new Error("OpenAlex: no title found");
  }

  const authors: Author[] = (work.authorships ?? []).map((a: any) => {
    const name = a.author?.display_name ?? "";
    const words = name.trim().split(/\s+/);
    return {
      lastName: words[words.length - 1],
      firstName: words.slice(0, -1).join(" "),
    };
  });

  const journal =
    work.primary_location?.source?.display_name ??
    work.host_venue?.display_name ??
    undefined;

  const pages =
    work.biblio?.first_page && work.biblio?.last_page
      ? `${work.biblio.first_page}–${work.biblio.last_page}`
      : work.biblio?.first_page ?? undefined;

  return {
    title: work.title,
    authors: authors.length ? authors : [{ lastName: "Unknown" }],
    year: work.publication_year?.toString(),
    journal,
    volume: work.biblio?.volume ?? undefined,
    issue: work.biblio?.issue ?? undefined,
    pages,
    publisher: work.publisher,
    doi,
    sourceType: journal ? "journal" : "unknown",
  };
}

async function fetchFromSemanticScholar(doi: string): Promise<CitationMetadata> {
  const fields = "title,authors,year,externalIds,journal,publicationVenue";
  const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(doi)}?fields=${fields}`;

  const res = await fetch(url, {
    headers: { "User-Agent": BOT_UA },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Semantic Scholar API returned ${res.status} for DOI: ${doi}`);
  }

  const paper = (await res.json()) as S2Paper;

  if (!paper.title) {
    throw new Error("Semantic Scholar: no title found");
  }

  const authors: Author[] = (paper.authors ?? []).map((a: any) => {
    const words = a.name.trim().split(/\s+/);
    return {
      lastName: words[words.length - 1],
      firstName: words.slice(0, -1).join(" "),
    };
  });

  const journal =
    paper.journal?.name ?? paper.publicationVenue?.name ?? undefined;

  return {
    title: paper.title,
    authors: authors.length ? authors : [{ lastName: "Unknown" }],
    year: paper.year?.toString(),
    journal,
    volume: paper.journal?.volume ?? undefined,
    pages: paper.journal?.pages ?? undefined,
    doi,
    sourceType: journal ? "journal" : "unknown",
  };
}

// ── Fallback chain ─────────────────────────────────────────────────────────

/**
 * Tries CrossRef → OpenAlex → Semantic Scholar in order.
 * On 429 (rate-limited): skips to the next API immediately.
 * On other errors: waits 1 second before trying the next API.
 * Throws a user-friendly message if all three fail.
 */
export async function fetchDOIWithFallback(
  doi: string,
): Promise<CitationMetadata> {
  // 1. CrossRef (polite pool, most comprehensive)
  try {
    return await fetchFromCrossRef(doi);
  } catch (err) {
    if (!is429(err)) await delay(1000);
  }

  // 2. OpenAlex (open, no key required)
  await delay(1000);
  try {
    return await fetchFromOpenAlex(doi);
  } catch (err) {
    if (!is429(err)) await delay(1000);
  }

  // 3. Semantic Scholar (last resort)
  await delay(1000);
  try {
    return await fetchFromSemanticScholar(doi);
  } catch {
    // all failed
  }

  throw new Error(
    "Could not fetch metadata. Please try entering the DOI directly.",
  );
}

// ── Public entry point ─────────────────────────────────────────────────────

export async function parseDOI(doi: string): Promise<CitationMetadata> {
  let cleanDOI = doi.trim();

  // Strip doi.org / dx.doi.org prefixes
  cleanDOI = cleanDOI.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");

  // If it still looks like a full URL, try to scrape the page for a DOI
  if (/^https?:\/\//i.test(cleanDOI)) {
    cleanDOI = await extractDOIFromURL(cleanDOI);
  }

  return fetchDOIWithFallback(cleanDOI);
}

// ── Internal: extract DOI by scraping a publisher page ────────────────────

/**
 * Fetches a publisher URL and extracts a DOI from meta tags / page content.
 * Supports ScienceDirect, Springer, Wiley, IEEE, Taylor & Francis, etc.
 */
async function extractDOIFromURL(pageUrl: string): Promise<string> {
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(
      `Could not fetch URL to extract DOI (HTTP ${res.status}). Use the URL tab instead.`,
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const doiMeta =
    $('meta[name="citation_doi"]').attr("content") ??
    $('meta[name="dc.identifier"][scheme="doi"]').attr("content") ??
    $('meta[name="DC.identifier"][scheme="doi"]').attr("content") ??
    $('meta[name="dc.identifier"]')
      .filter((_: any, el: any) => /^10\.\d{4,}/.test($(el).attr("content") ?? ""))
      .attr("content") ??
    $('meta[name="DC.Identifier"]')
      .filter((_: any, el: any) => /^10\.\d{4,}/.test($(el).attr("content") ?? ""))
      .attr("content") ??
    $('meta[name="prism.doi"]').attr("content") ??
    $('meta[property="citation_doi"]').attr("content") ??
    $('meta[name="DOI"]').attr("content");

  if (doiMeta) {
    return doiMeta.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
  }

  // Fallback: scan for a DOI pattern in the HTML (first match)
  const doiRegex = /\b(10\.\d{4,}\/[^\s"'<>&]+)/;
  const match = html.match(doiRegex);
  if (match) {
    return match[1];
  }

  throw new Error(
    "Could not find a DOI on that page. Please enter the DOI directly (e.g. 10.1038/s41586-020-2649-2) or use the URL tab.",
  );
}
