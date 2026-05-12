// Content script: extract page metadata
function extractMetadata() {
  const getMeta = (name) =>
    document.querySelector(`meta[name="${name}"]`)?.content ||
    document.querySelector(`meta[property="${name}"]`)?.content ||
    null;

  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    document.title ||
    "Unknown Title";

  const authorMeta =
    getMeta("author") ||
    getMeta("article:author") ||
    getMeta("DC.creator");

  let authors = [];
  if (authorMeta) {
    const parts = authorMeta.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    authors = parts.map((name) => {
      const words = name.split(" ").filter(Boolean);
      return {
        firstName: words.slice(0, -1).join(" "),
        lastName: words[words.length - 1] || name,
      };
    });
  }

  const dateStr =
    getMeta("article:published_time") ||
    getMeta("date") ||
    getMeta("DC.date") ||
    document.querySelector("time[datetime]")?.getAttribute("datetime");

  let year;
  if (dateStr) {
    const m = dateStr.match(/(\d{4})/);
    if (m) year = m[1];
  }

  const website =
    getMeta("og:site_name") ||
    window.location.hostname.replace(/^www\./, "");

  // Try JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const ld = JSON.parse(script.textContent || "{}");
      const type = ld["@type"];
      if (["Article", "NewsArticle", "ScholarlyArticle", "BlogPosting"].includes(type)) {
        if (ld.author && !authors.length) {
          const auth = Array.isArray(ld.author) ? ld.author : [ld.author];
          authors = auth.filter((a) => a.name).map((a) => {
            const words = a.name.split(" ");
            return { firstName: words.slice(0, -1).join(" "), lastName: words[words.length - 1] };
          });
        }
        if (ld.datePublished && !year) {
          const m = ld.datePublished.match(/(\d{4})/);
          if (m) year = m[1];
        }
        break;
      }
    } catch (_) {}
  }

  if (!authors.length) {
    authors = [{ firstName: "", lastName: "Unknown" }];
  }

  return {
    title,
    authors,
    year,
    website,
    url: window.location.href,
    accessDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    sourceType: "website",
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getMetadata") {
    sendResponse({ metadata: extractMetadata() });
  }
  return true;
});
