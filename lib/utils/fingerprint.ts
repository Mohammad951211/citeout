"use client";

let cachedFingerprint: string | null = null;

export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  try {
    const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
    const fp = await FingerprintJS.default.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    return cachedFingerprint;
  } catch {
    // Fallback to a session-based ID
    const key = "citeout_fp";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).substring(2);
      sessionStorage.setItem(key, id);
    }
    cachedFingerprint = id;
    return id;
  }
}
