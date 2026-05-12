// Background service worker
const PROD_API_BASE = "https://citeout.site";
const HEALTH_PATH = "/api/health";
const GUEST_LIMIT = 5;

chrome.runtime.onInstalled.addListener(() => {
  console.log("CiteOut extension installed");
});

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter((v) => typeof v === "string" && v.trim().length > 0))];
}

async function isApiReachable(apiBase) {
  try {
    const response = await fetch(`${apiBase}${HEALTH_PATH}`, {
      method: "GET",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function resolveApiBase(preferredBase) {
  const savedBase = await storageGet("apiBaseUrl");
  const candidates = uniqueNonEmpty([preferredBase, savedBase, PROD_API_BASE]);

  for (const base of candidates) {
    if (await isApiReachable(base)) {
      return { apiBase: base, reachable: true };
    }
  }

  return { apiBase: PROD_API_BASE, reachable: false };
}

function hasArabicScript(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "website";
  }
}

function normalizeMetadata(meta) {
  const normalized = { ...meta };
  const url = normalized.url || "";
  const hostname = hostLabel(url);
  const fallbackTitle = `Official website of ${hostname}`;

  if (!normalized.title || hasArabicScript(normalized.title)) {
    normalized.title = fallbackTitle;
  }

  if (!normalized.website || hasArabicScript(normalized.website)) {
    normalized.website = hostname;
  }

  const authors = Array.isArray(normalized.authors) ? normalized.authors : [];
  normalized.authors = authors.filter((a) => {
    const fullName = `${a?.firstName || ""} ${a?.lastName || ""}`.trim();
    return fullName && !hasArabicScript(fullName) && fullName.toLowerCase() !== "unknown";
  });

  if (!normalized.accessDate) {
    normalized.accessDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  normalized.sourceType = "website";
  return normalized;
}

function formatAuthorList(authors) {
  if (!authors.length) return "";
  return authors
    .map((a) => {
      if (!a.firstName) return a.lastName;
      return `${a.lastName}, ${a.firstName.charAt(0)}.`;
    })
    .join(", ");
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateCitation") {
    handleGenerateCitation(request.data).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message || "Failed to generate citation" });
    });
    return true; // Keep message channel open for async
  }
  if (request.action === "checkApi") {
    resolveApiBase(request.apiBaseOverride)
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ apiBase: DEV_API_BASE, reachable: false }));
    return true;
  }
  if (request.action === "getGuestUsage") {
    handleGetGuestUsage(request.fingerprint, request.apiBaseOverride).then(sendResponse).catch(() => {
      sendResponse({ count: 0, remaining: GUEST_LIMIT, limit: GUEST_LIMIT, mode: "fallback" });
    });
    return true;
  }
  if (request.action === "incrementGuestUsage") {
    handleIncrementGuestUsage(request.fingerprint, request.apiBaseOverride).then(sendResponse).catch(() => {
      sendResponse({ count: 1, mode: "fallback" });
    });
    return true;
  }
});

async function handleGenerateCitation({ metadata, style, journalRank, apiBaseOverride }) {
  const normalizedMeta = normalizeMetadata(metadata);
  const resolved = await resolveApiBase(apiBaseOverride);
  const requestedRank = journalRank || null;

  if (!resolved.reachable) {
    return {
      citation: formatFallback(normalizedMeta, style),
      metadata: normalizedMeta,
      journalRank: requestedRank,
      mode: "fallback",
      apiBase: resolved.apiBase,
      warning: "API unreachable",
    };
  }

  try {
    const response = await fetch(`${resolved.apiBase}/api/cite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        style,
        sourceType: "URL",
        sourceInput: normalizedMeta.url,
        journalRank: journalRank || null,
        metadata: normalizedMeta,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "API request failed");
    }

    const data = await response.json();
    return {
      citation: data.citation,
      metadata: data.metadata || normalizedMeta,
      journalRank: data.journalRank ?? requestedRank,
      mode: "server",
      apiBase: resolved.apiBase,
    };
  } catch (err) {
    const citation = formatFallback(normalizedMeta, style);
    return {
      citation,
      metadata: normalizedMeta,
      journalRank: requestedRank,
      mode: "fallback",
      apiBase: resolved.apiBase,
      warning: err?.message || "Server citation failed",
    };
  }
}

function formatFallback(meta, style) {
  const authorStr = formatAuthorList(meta.authors || []);
  const authorPrefix = authorStr ? `${authorStr}. ` : "";
  const year = meta.year || "n.d.";
  const title = meta.title || `Official website of ${hostLabel(meta.url || "")}`;
  const website = meta.website || hostLabel(meta.url || "");
  const url = meta.url || "";

  switch (style) {
    case "MLA":
      return `${authorPrefix}"${title}." ${website ? `*${website}*, ` : ""}${year}. ${url}`.trim();
    case "CHICAGO":
      return `${authorPrefix}"${title}." ${website ? `*${website}*. ` : ""}${year}. ${url}.`.trim();
    case "IEEE":
      return `[1] ${authorStr ? `${authorStr}, ` : ""}"${title}," ${website ? `*${website}*, ` : ""}${year}. [Online]. Available: ${url}.`;
    case "HARVARD":
      return `${authorStr ? `${authorStr} ` : ""}(${year}) *${title}*. ${website}. Available at: ${url}`;
    case "VANCOUVER":
      return `1. ${authorPrefix}${title} [Internet]. ${website}. ${year} [cited ${meta.accessDate}]. Available from: ${url}`;
    default: // APA
      return `${authorPrefix}(${year}). *${title}*. ${website}. ${url}`;
  }
}

async function handleGetGuestUsage(fingerprint, apiBaseOverride) {
  const resolved = await resolveApiBase(apiBaseOverride);
  if (!resolved.reachable) {
    return {
      count: 0,
      remaining: GUEST_LIMIT,
      limit: GUEST_LIMIT,
      mode: "fallback",
      apiBase: resolved.apiBase,
    };
  }

  const response = await fetch(`${resolved.apiBase}/api/guest/usage?fingerprint=${fingerprint}`);
  const usage = await response.json();
  return { ...usage, mode: "server", apiBase: resolved.apiBase };
}

async function handleIncrementGuestUsage(fingerprint, apiBaseOverride) {
  const resolved = await resolveApiBase(apiBaseOverride);
  if (!resolved.reachable) {
    return { count: 1, mode: "fallback", apiBase: resolved.apiBase };
  }

  const response = await fetch(`${resolved.apiBase}/api/guest/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint }),
  });
  const usage = await response.json();
  return { ...usage, mode: "server", apiBase: resolved.apiBase };
}
