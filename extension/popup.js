const GUEST_LIMIT = 5;
let currentCitation = "";
let fingerprint = null;
let apiHealth = { reachable: false, apiBase: "https://citeout.site" };

// Simple fingerprint from browser info
async function getFingerprint() {
  if (fingerprint) return fingerprint;
  return new Promise((resolve) => {
    chrome.storage.local.get(["fp"], (result) => {
      if (result.fp) {
        fingerprint = result.fp;
        resolve(fingerprint);
      } else {
        const fp = Math.random().toString(36).substring(2) + Date.now().toString(36);
        chrome.storage.local.set({ fp });
        fingerprint = fp;
        resolve(fingerprint);
      }
    });
  });
}

async function init() {
  const fp = await getFingerprint();

  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  const urlDisplay = document.getElementById("url-display");
  urlDisplay.textContent = url || "No URL";
  urlDisplay.title = url;

  // Load saved style preference
  chrome.storage.local.get(["preferredStyle"], (result) => {
    if (result.preferredStyle) {
      document.getElementById("style-select").value = result.preferredStyle;
    }
  });

  await refreshApiHealth();

  // Check guest usage
  try {
    const usage = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getGuestUsage", fingerprint: fp, apiBaseOverride: apiHealth.apiBase },
        resolve
      );
    });
    updateGuestCounter(usage);
  } catch (_) {}
}

async function refreshApiHealth() {
  const status = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "checkApi", apiBaseOverride: apiHealth.apiBase }, resolve);
  });

  apiHealth = status || apiHealth;
  updateApiStatus(apiHealth);
}

function updateApiStatus(status) {
  const el = document.getElementById("api-status");
  if (!el) return;

  if (status?.reachable) {
    el.className = "api-status online";
    el.textContent = `Connected: ${status.apiBase}`;
    return;
  }

  el.className = "api-status fallback";
  el.textContent = `Offline mode: local fallback formatting (${status?.apiBase || "no API"})`;
}

function updateGuestCounter(usage) {
  const counter = document.getElementById("guest-counter");
  if (!usage) return;
  const remaining = usage.remaining ?? (GUEST_LIMIT - (usage.count || 0));
  if (remaining > 0) {
    counter.textContent = `${remaining} free citation${remaining !== 1 ? "s" : ""} remaining`;
  } else {
    counter.textContent = "Free limit reached — sign in for unlimited access";
    counter.style.color = "#DC2626";
  }
}

function showLoading(loading) {
  const btn = document.getElementById("generate-btn");
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>Generating...';
  } else {
    btn.disabled = false;
    btn.innerHTML = "Generate Citation";
  }
}

function showOutput(citation, style, mode, apiBase, journalRank) {
  currentCitation = citation;
  document.getElementById("output-section").classList.remove("hidden");
  document.getElementById("error-section").classList.add("hidden");
  document.getElementById("output-style").textContent = style;
  document.getElementById("output-text").textContent = citation;

  const rankEl = document.getElementById("output-rank");
  if (rankEl) {
    if (journalRank) {
      rankEl.textContent = journalRank;
      rankEl.classList.remove("hidden");
    } else {
      rankEl.textContent = "";
      rankEl.classList.add("hidden");
    }
  }

  const modeEl = document.getElementById("output-mode");
  if (modeEl) {
    const isServer = mode === "server";
    modeEl.className = `output-mode ${isServer ? "server" : "fallback"}`;
    modeEl.textContent = isServer ? "Server" : "Fallback";
    modeEl.title = apiBase ? `Generated via ${apiBase}` : "Generated with fallback formatter";
  }
}

function showError(message) {
  document.getElementById("error-section").classList.remove("hidden");
  document.getElementById("output-section").classList.add("hidden");
  document.getElementById("error-text").textContent = message;
}

document.getElementById("generate-btn").addEventListener("click", async () => {
  const style = document.getElementById("style-select").value;

  // Save preferences
  chrome.storage.local.set({ preferredStyle: style });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError("Cannot access current tab");
    return;
  }

  showLoading(true);

  try {
    await refreshApiHealth();

    // Get metadata from content script
    const metaResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: "getMetadata" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error("Cannot access this page"));
        } else {
          resolve(response);
        }
      });
    });

    const metadata = metaResponse?.metadata;
    if (!metadata) {
      throw new Error("Could not extract page metadata");
    }

    const fp = await getFingerprint();

    // Generate citation
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "generateCitation",
          data: { metadata, style, apiBaseOverride: apiHealth.apiBase },
        },
        resolve
      );
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    showOutput(result.citation, style, result.mode, result.apiBase, result.journalRank);

    // Increment guest usage
    const usage = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "incrementGuestUsage", fingerprint: fp, apiBaseOverride: apiHealth.apiBase },
        resolve
      );
    });
    updateGuestCounter(usage);

  } catch (err) {
    showError(err.message || "Failed to generate citation");
  } finally {
    showLoading(false);
  }
});

document.getElementById("copy-btn").addEventListener("click", async () => {
  if (!currentCitation) return;
  try {
    await navigator.clipboard.writeText(currentCitation);
    const btn = document.getElementById("copy-btn");
    btn.classList.add("copied");
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      `;
    }, 2000);
  } catch (_) {}
});

// Initialize
init();
