import { CitationMetadata, Author, JournalRank } from "@/lib/citation/types";
import * as cheerio from "cheerio";
import { parseDOI, fetchDOIWithFallback } from "./doi";

// ── Constants ──────────────────────────────────────────────────────────────

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

// Matches a bare DOI (10.XXXX/...) anywhere in a string
const DOI_RE = /\b(10\.\d{4,}\/[^\s?#&"'<>]+)/;

const QUARTILE_PRIORITY: Record<JournalRank, number> = {
  Q1: 4,
  Q2: 3,
  Q3: 2,
  Q4: 1,
  UNRANKED: 0,
};

function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function hostLabelFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function englishWebsiteTitle(url: string): string {
  return `Official website of ${hostLabelFromUrl(url)}`;
}

function bestJournalRank(matches: JournalRank[]): JournalRank | undefined {
  if (!matches.length) return undefined;
  let best: JournalRank = matches[0];
  let bestScore = QUARTILE_PRIORITY[best] ?? 0;
  for (const rank of matches.slice(1)) {
    const score = QUARTILE_PRIORITY[rank] ?? 0;
    if (score > bestScore) {
      best = rank;
      bestScore = score;
    }
  }
  return best;
}

function extractJournalRankFromRankingPage(
  $: cheerio.CheerioAPI,
  html: string,
  pageUrl: string,
): JournalRank | undefined {
  const host = new URL(pageUrl).hostname.toLowerCase();
  const bodyText = $("body").text();
  const looksLikeRankingPage =
    host.includes("scimagojr") ||
    host.includes("excitation") ||
    /\bSJR\b/i.test(bodyText) ||
    /quartile/i.test(bodyText);

  if (!looksLikeRankingPage) return undefined;

  const text = `${bodyText}\n${html}`;
  const found: JournalRank[] = [];
  const matches = text.matchAll(/\bQ([1-4])\b/g);
  for (const m of matches) {
    found.push(`Q${m[1]}` as JournalRank);
  }

  return bestJournalRank(found);
}

// ── Step 1 helpers: DOI extraction without any network call ────────────────

function doiFromUrlString(url: string): string | null {
  const decoded = decodeURIComponent(url);
  const m = decoded.match(DOI_RE);
  return m ? m[1] : null;
}

function piiFromScienceDirectUrl(url: string): string | null {
  const m = url.match(
    /sciencedirect\.com\/science\/article\/(?:abs\/)?pii\/([A-Z0-9]+)/i,
  );
  return m ? m[1] : null;
}

function arnumberFromIeeeUrl(url: string): string | null {
  const m = url.match(/ieeexplore\.ieee\.org\/(?:abstract\/)?document\/(\d+)/i);
  return m ? m[1] : null;
}

// ── Academic site detection ────────────────────────────────────────────────

function isAcademicSite(url: string): boolean {
  return (
    /ieeexplore\.ieee\.org/.test(url) ||
    /dl\.acm\.org/.test(url) ||
    /link\.springer\.com/.test(url) ||
    /sciencedirect\.com/.test(url)
  );
}

// ── citation_* meta tag extraction ────────────────────────────────────────
//
// IEEE Xplore, ACM DL, Springer, and Elsevier all embed structured metadata
// using Dublin Core / Highwire Press citation_* <meta> tags that are present
// in the initial server-rendered HTML even for paywalled articles.

function extractFromCitationMeta(
  $: cheerio.CheerioAPI,
  pageUrl: string,
): CitationMetadata | null {
  const title = $('meta[name="citation_title"]').attr("content")?.trim();
  if (!title) return null;

  // Authors (multiple <meta name="citation_author"> tags)
  const authors: Author[] = [];
  $('meta[name="citation_author"]').each((_, el) => {
    const raw = $(el).attr("content")?.trim();
    if (!raw) return;
    // "Last, First" or "First Last"
    if (raw.includes(",")) {
      const [last, ...firstParts] = raw.split(",").map((s: any) => s.trim());
      authors.push({ lastName: last, firstName: firstParts.join(" ") || undefined });
    } else {
      const words = raw.split(/\s+/);
      authors.push({
        lastName: words[words.length - 1],
        firstName: words.slice(0, -1).join(" ") || undefined,
      });
    }
  });

  const journal =
    $('meta[name="citation_journal_title"]').attr("content")?.trim() ??
    $('meta[name="citation_conference_title"]').attr("content")?.trim();

  const volume = $('meta[name="citation_volume"]').attr("content")?.trim();
  const issue = $('meta[name="citation_issue"]').attr("content")?.trim();

  const firstPage = $('meta[name="citation_firstpage"]').attr("content")?.trim();
  const lastPage = $('meta[name="citation_lastpage"]').attr("content")?.trim();
  const pages =
    firstPage && lastPage
      ? `${firstPage}–${lastPage}`
      : firstPage ?? undefined;

  const rawDate =
    $('meta[name="citation_publication_date"]').attr("content") ??
    $('meta[name="citation_date"]').attr("content");
  const yearMatch = rawDate?.match(/(\d{4})/);
  const year = yearMatch?.[1];

  const rawDoi = $('meta[name="citation_doi"]').attr("content")?.trim();
  const doi = rawDoi
    ? rawDoi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim()
    : undefined;

  const publisher =
    $('meta[name="citation_publisher"]').attr("content")?.trim();

  return {
    title,
    authors: authors.length ? authors : [{ lastName: "Unknown" }],
    year,
    journal,
    volume,
    issue,
    pages,
    publisher,
    doi,
    url: pageUrl,
    sourceType: journal ? "journal" : "unknown",
  };
}

// ── IEEE Xplore REST API ───────────────────────────────────────────────────

interface IEEEArticle {
  title?: string;
  authors?: { authors?: Array<{ full_name?: string }> };
  publication_title?: string;
  volume?: string;
  issue?: string;
  start_page?: string;
  end_page?: string;
  publication_year?: string | number;
  doi?: string;
}

async function fetchIEEEMetadata(articleId: string): Promise<CitationMetadata | null> {
  const apiKey = process.env.IEEE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://ieeexploreapi.ieee.org/api/v1/search/articles?article_number=${articleId}&apikey=${apiKey}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { articles?: IEEEArticle[] };
    const article = data.articles?.[0];
    if (!article?.title) return null;

    const authors: Author[] = (article.authors?.authors ?? []).map((a: any) => {
      const name = a.full_name?.trim() ?? "";
      const words = name.split(/\s+/);
      return {
        lastName: words[words.length - 1],
        firstName: words.slice(0, -1).join(" ") || undefined,
      };
    });

    const firstPage = article.start_page;
    const lastPage = article.end_page;
    const pages =
      firstPage && lastPage ? `${firstPage}–${lastPage}` : firstPage ?? undefined;

    return {
      title: article.title,
      authors: authors.length ? authors : [{ lastName: "Unknown" }],
      year: article.publication_year?.toString(),
      journal: article.publication_title,
      volume: article.volume,
      issue: article.issue,
      pages,
      doi: article.doi,
      sourceType: article.publication_title ? "journal" : "unknown",
    };
  } catch {
    return null;
  }
}

// ── Step 2 helpers: recover DOI when URL alone isn't enough ───────────────

async function doiFromCrossRefPii(pii: string): Promise<string | null> {
  const email = process.env.CROSSREF_API_EMAIL ?? "contact@citeout.com";
  const url = `https://api.crossref.org/works?filter=alternative-id:${pii}&rows=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `CiteOut/1.0 (mailto:${email})` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      message?: { items?: Array<{ DOI?: string }> };
    };
    return data.message?.items?.[0]?.DOI ?? null;
  } catch {
    return null;
  }
}

async function doiFromPageMeta(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const raw =
      $('meta[name="citation_doi"]').attr("content") ??
      $('meta[name="dc.identifier"][scheme="doi"]').attr("content") ??
      $('meta[name="DC.identifier"][scheme="doi"]').attr("content") ??
      $('meta[name="prism.doi"]').attr("content") ??
      $('meta[name="DOI"]').attr("content") ??
      $('meta[name="dc.identifier"]')
        .filter((_: any, el: any) => /^10\.\d{4,}/.test($(el).attr("content") ?? ""))
        .attr("content") ??
      $('meta[name="DC.Identifier"]')
        .filter((_: any, el: any) => /^10\.\d{4,}/.test($(el).attr("content") ?? ""))
        .attr("content");

    if (raw) {
      const clean = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
      if (/^10\.\d{4,}\//.test(clean)) return clean;
    }

    const m = html.match(DOI_RE);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// ── Main export ────────────────────────────────────────────────────────────

export async function parseURL(url: string): Promise<CitationMetadata> {
  // ── 1. DOI embedded in the URL string — free, no network ──────────────
  const doiFromUrl = doiFromUrlString(url);
  if (doiFromUrl) {
    return parseDOI(doiFromUrl);
  }

  // ── 2. ScienceDirect PII URL ───────────────────────────────────────────
  const pii = piiFromScienceDirectUrl(url);
  if (pii) {
    const doiFromMeta = await doiFromPageMeta(url);
    if (doiFromMeta) return fetchDOIWithFallback(doiFromMeta);

    const doiFromCR = await doiFromCrossRefPii(pii);
    if (doiFromCR) return fetchDOIWithFallback(doiFromCR);

    throw new Error(
      "Could not extract metadata for this ScienceDirect article. " +
        "Please find the DOI on the article page and enter it directly.",
    );
  }

  // ── 3. IEEE Xplore URL ─────────────────────────────────────────────────
  const ieeeId = arnumberFromIeeeUrl(url);
  if (ieeeId) {
    // a. IEEE REST API (requires IEEE_API_KEY)
    const ieeeMetadata = await fetchIEEEMetadata(ieeeId);
    if (ieeeMetadata) return ieeeMetadata;

    // b. Fetch page and try citation_* meta tags first
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        // Try structured citation_* extraction (most reliable for IEEE)
        const fromMeta = extractFromCitationMeta($, url);
        if (fromMeta) return fromMeta;

        // c. Fall back to DOI-based lookup
        const rawDoi =
          $('meta[name="citation_doi"]').attr("content") ??
          $('meta[name="DOI"]').attr("content");
        if (rawDoi) {
          const cleanDoi = rawDoi
            .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
            .trim();
          if (/^10\.\d{4,}\//.test(cleanDoi)) {
            try {
              return await fetchDOIWithFallback(cleanDoi);
            } catch {
              // fall through
            }
          }
        }
      }
    } catch {
      // fall through to generic scraping
    }
  }

  // ── 4. Direct scraping with real browser headers ───────────────────────
  let html: string | null = null;
  let fetchError: Error | null = null;

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      fetchError = new Error(`Failed to fetch URL: ${response.status}`);
    } else {
      html = await response.text();
    }
  } catch (err) {
    fetchError = err instanceof Error ? err : new Error("Network error");
  }

  // ── 5. Fetch failed — no HTML available ───────────────────────────────
  if (!html) {
    const status = fetchError?.message.match(/\d{3}/)?.[0];
    const hint =
      status === "403"
        ? " This site blocks automated requests. If this is an academic article, copy the DOI from the page and enter it directly."
        : "";
    throw new Error((fetchError?.message ?? "Failed to fetch URL") + hint);
  }

  const $ = cheerio.load(html);
  const detectedRank = extractJournalRankFromRankingPage($, html, url);

  // ── 6. citation_* meta tags (IEEE, ACM, Springer, Elsevier, …) ────────
  //    These tags are present in server-rendered HTML even for paywalled
  //    content, making them the most reliable extraction path.
  if (isAcademicSite(url)) {
    const fromCitationMeta = extractFromCitationMeta($, url);
    if (fromCitationMeta) {
      // Verify we have a meaningful title
      if (fromCitationMeta.title && fromCitationMeta.title !== "**") {
        // Optionally enrich via DOI if available
        if (fromCitationMeta.doi) {
          try {
            return await fetchDOIWithFallback(fromCitationMeta.doi);
          } catch {
            return fromCitationMeta;
          }
        }
        return fromCitationMeta;
      }
    }
  }

  // ── 7. DOI in page meta tags → delegate to the full fallback chain ─────
  const rawMetaDoi =
    $('meta[name="citation_doi"]').attr("content") ??
    $('meta[name="dc.identifier"][scheme="doi"]').attr("content") ??
    $('meta[name="DC.identifier"][scheme="doi"]').attr("content") ??
    $('meta[name="prism.doi"]').attr("content") ??
    $('meta[name="DOI"]').attr("content");

  if (rawMetaDoi) {
    const cleanDoi = rawMetaDoi
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
      .trim();
    if (/^10\.\d{4,}\//.test(cleanDoi)) {
      try {
        return await fetchDOIWithFallback(cleanDoi);
      } catch {
        // fall through to HTML parsing below
      }
    }
  }

  // ── 8. citation_* meta tags for non-academic sites ────────────────────
  const fromCitationMetaGeneric = extractFromCitationMeta($, url);
  if (fromCitationMetaGeneric) return fromCitationMetaGeneric;

  // ── 9. Standard HTML / Open Graph / JSON-LD parsing ───────────────────
  const title =
    $('meta[property="og:title"]').attr("content") ??
    $('meta[name="twitter:title"]').attr("content") ??
    $("title").text().trim() ??
    "Unknown Title";

  // Reject clearly empty titles
  if (!title || title === "**") {
    throw new Error(
      "Could not extract metadata from this URL. The page may be paywalled or require JavaScript rendering.",
    );
  }

  const authorMeta =
    $('meta[name="author"]').attr("content") ??
    $('meta[property="article:author"]').attr("content") ??
    $('meta[name="DC.creator"]').attr("content");

  const authors: Author[] = [];
  if (authorMeta) {
    const parts = authorMeta.split(",").map((s: any) => s.trim());
    if (parts.length >= 2 && parts[0].split(" ").length === 1) {
      authors.push({ lastName: parts[0], firstName: parts[1] });
    } else {
      authorMeta.split(/[,;]/).forEach((name: any) => {
        const trimmed = name.trim();
        if (trimmed) {
          const words = trimmed.split(" ");
          authors.push({
            lastName: words[words.length - 1],
            firstName: words.slice(0, -1).join(" "),
          });
        }
      });
    }
  }

  const dateStr =
    $('meta[property="article:published_time"]').attr("content") ??
    $('meta[name="date"]').attr("content") ??
    $('meta[name="DC.date"]').attr("content") ??
    $('time[datetime]').first().attr("datetime");

  let year: string | undefined;
  if (dateStr) {
    const m = dateStr.match(/(\d{4})/);
    if (m) year = m[1];
  }

  const website =
    $('meta[property="og:site_name"]').attr("content") ??
    new URL(url).hostname.replace(/^www\./, "");

  // JSON-LD author enrichment
  if (!authors.length) {
    $('script[type="application/ld+json"]').each((_: any, el: any) => {
      if (authors.length) return;
      try {
        const ld = JSON.parse($(el).html() ?? "{}") as Record<string, unknown>;
        if (
          ld["@type"] === "Article" ||
          ld["@type"] === "NewsArticle" ||
          ld["@type"] === "ScholarlyArticle"
        ) {
          const auth = ld.author as
            | { name?: string }
            | Array<{ name?: string }>
            | undefined;
          if (auth) {
            const arr = Array.isArray(auth) ? auth : [auth];
            arr.forEach((a: any) => {
              if (a.name) {
                const words = a.name.split(" ");
                authors.push({
                  lastName: words[words.length - 1],
                  firstName: words.slice(0, -1).join(" "),
                });
              }
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    });
  }

  const accessDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const normalizedTitle = hasArabicScript(title) ? englishWebsiteTitle(url) : title;
  const normalizedWebsite = hasArabicScript(website) ? hostLabelFromUrl(url) : website;
  const normalizedAuthors = authors.filter((a) => {
    const fullName = `${a.firstName ?? ""} ${a.lastName}`.trim();
    return fullName && !hasArabicScript(fullName);
  });

  return {
    title: normalizedTitle,
    authors: normalizedAuthors,
    year,
    website: normalizedWebsite,
    url,
    accessDate,
    sourceType: "website",
    journalRank: detectedRank,
  };
}
