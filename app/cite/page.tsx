"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StyleSelector } from "@/components/cite/StyleSelector";
import { CitationOutput } from "@/components/cite/CitationOutput";
import { FileUpload } from "@/components/cite/FileUpload";
import { ManualEntryForm } from "@/components/cite/ManualEntryForm";
import { Modal } from "@/components/ui/Modal";
import { CitationStyle, JournalRank, CitationMetadata, RankSource } from "@/lib/citation/types";
import { getFingerprint } from "@/lib/utils/fingerprint";
import { cn } from "@/lib/utils/cn";
import toast from "react-hot-toast";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

const TABS = [
  { id: "doi", label: "DOI" },
  { id: "url", label: "URL" },
  { id: "file", label: "File Upload" },
  { id: "manual", label: "Manual Entry" },
];

const CITATION_STYLES: CitationStyle[] = ["APA", "MLA", "CHICAGO", "IEEE", "HARVARD", "VANCOUVER"];

const STYLE_LABELS: Record<CitationStyle, string> = {
  APA: "APA 7th",
  MLA: "MLA 9th",
  CHICAGO: "Chicago 17th",
  IEEE: "IEEE",
  HARVARD: "Harvard",
  VANCOUVER: "Vancouver",
};

interface CitationResult {
  citation: string;
  style: CitationStyle;
  journalRank?: JournalRank;
  rankSource?: RankSource;
  citationId?: string | null;
  inLibrary?: boolean;
}

interface LastSource {
  type: "doi" | "url" | "file" | "manual";
  doi?: string;
  url?: string;
  file?: File;
  metadata?: CitationMetadata;
}

const GUEST_LIMIT = 5;

export default function CitePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("doi");
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [doiInput, setDoiInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CitationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastSource, setLastSource] = useState<LastSource | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [movingToLibrary, setMovingToLibrary] = useState(false);

  useEffect(() => {
    if (!session) {
      getFingerprint().then(async (fp) => {
        setFingerprint(fp);
        const res = await fetch(`/api/guest/usage?fingerprint=${fp}`);
        if (res.ok) {
          const data = (await res.json()) as { count: number };
          setGuestCount(data.count);
        }
      });
    }
  }, [session]);

  const checkGuestLimit = async (): Promise<boolean> => {
    if (session) return true;
    if (guestCount >= GUEST_LIMIT) {
      setShowLimitModal(true);
      return false;
    }
    return true;
  };

  const incrementGuest = async () => {
    if (!session && fingerprint) {
      const res = await fetch("/api/guest/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setGuestCount(data.count);
      }
    }
  };

  const handleDOI = async (styleOverride?: CitationStyle) => {
    if (!doiInput.trim()) return toast.error("Please enter a DOI");
    if (!(await checkGuestLimit())) return;
    const effectiveStyle = styleOverride ?? style;
    setLoading(true);
    try {
      const res = await fetch("/api/cite/from-doi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doi: doiInput.trim(), style: effectiveStyle }),
      });
      const data = (await res.json()) as { citation?: string; journalRank?: JournalRank; rankSource?: RankSource; citationId?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate citation");
      setResult({ citation: data.citation!, style: effectiveStyle, journalRank: data.journalRank, rankSource: data.rankSource, citationId: data.citationId ?? null, inLibrary: false });
      setShowResult(true);
      setLastSource({ type: "doi", doi: doiInput.trim() });
      if (!styleOverride) await incrementGuest();
      toast.success("Citation generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generating citation");
    } finally {
      setLoading(false);
    }
  };

  const handleURL = async (styleOverride?: CitationStyle) => {
    if (!urlInput.trim()) return toast.error("Please enter a URL");
    if (!(await checkGuestLimit())) return;
    const effectiveStyle = styleOverride ?? style;
    setLoading(true);
    try {
      const res = await fetch("/api/cite/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim(), style: effectiveStyle }),
      });
      const data = (await res.json()) as { citation?: string; journalRank?: JournalRank; rankSource?: RankSource; citationId?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate citation");
      setResult({ citation: data.citation!, style: effectiveStyle, journalRank: data.journalRank, rankSource: data.rankSource, citationId: data.citationId ?? null, inLibrary: false });
      setShowResult(true);
      setLastSource({ type: "url", url: urlInput.trim() });
      if (!styleOverride) await incrementGuest();
      toast.success("Citation generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generating citation");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (styleOverride?: CitationStyle) => {
    if (!file) return toast.error("Please select a file");
    if (!(await checkGuestLimit())) return;
    const effectiveStyle = styleOverride ?? style;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("style", effectiveStyle);
      const res = await fetch("/api/cite/from-file", { method: "POST", body: formData });
      const data = (await res.json()) as { citation?: string; journalRank?: JournalRank; rankSource?: RankSource; citationId?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to parse file");
      setResult({ citation: data.citation!, style: effectiveStyle, journalRank: data.journalRank, rankSource: data.rankSource, citationId: data.citationId ?? null, inLibrary: false });
      setShowResult(true);
      setLastSource({ type: "file", file });
      if (!styleOverride) await incrementGuest();
      toast.success("Citation generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generating citation");
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async (metadata: CitationMetadata, styleOverride?: CitationStyle) => {
    if (!(await checkGuestLimit())) return;
    const effectiveStyle = styleOverride ?? style;
    setLoading(true);
    try {
      const res = await fetch("/api/cite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: effectiveStyle,
          sourceType: "MANUAL",
          sourceInput: metadata.title,
          metadata,
        }),
      });
      const data = (await res.json()) as { citation?: string; journalRank?: JournalRank; rankSource?: RankSource; citationId?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate citation");
      setResult({ citation: data.citation!, style: effectiveStyle, journalRank: data.journalRank, rankSource: data.rankSource, citationId: data.citationId ?? null, inLibrary: false });
      setShowResult(true);
      setLastSource({ type: "manual", metadata });
      if (!styleOverride) await incrementGuest();
      toast.success("Citation generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generating citation");
    } finally {
      setLoading(false);
    }
  };

  const handleStyleSwitch = async (newStyle: CitationStyle) => {
    if (!lastSource || loading) return;
    setStyle(newStyle);
    switch (lastSource.type) {
      case "doi":
        await handleDOI(newStyle);
        break;
      case "url":
        await handleURL(newStyle);
        break;
      case "file":
        await handleFile(newStyle);
        break;
      case "manual":
        if (lastSource.metadata) await handleManual(lastSource.metadata, newStyle);
        break;
    }
  };

  const handleMoveToLibrary = async () => {
    if (!result?.citationId) {
      toast.error("Sign in to save citations to your library");
      return;
    }

    setMovingToLibrary(true);
    try {
      const res = await fetch(`/api/cite/${result.citationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inLibrary: true }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to move citation to library");

      setResult((prev) => (prev ? { ...prev, inLibrary: true } : prev));
      toast.success("Moved to library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move citation to library");
    } finally {
      setMovingToLibrary(false);
    }
  };

  const remaining = GUEST_LIMIT - guestCount;
  const showResultPanel = showResult && result !== null;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />

      {/*
       * Desktop (md+): flex-row, overflow-hidden, min-h-0 so panels scroll internally.
       * Mobile (<md):  flex-col, no overflow restriction — page scrolls naturally.
       */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden md:min-h-0">

        {/* ── INPUT PANEL ──────────────────────────────────────────────── */}
        <div
          className={cn(
            "overflow-y-auto transition-all duration-300 ease-in-out",
            showResultPanel
              ? "w-full md:w-[45%] md:border-r md:border-[var(--border)]"
              : "w-full"
          )}
        >
          <div
            className={cn(
              "min-h-full w-full flex flex-col",
              showResultPanel ? "justify-start" : "md:justify-center md:items-center"
            )}
          >
            <div
              className={cn(
                "w-full p-6 md:p-8 space-y-6",
                !showResultPanel && "md:max-w-[700px]"
              )}
            >
              {/* Page header */}
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                  Citation Generator
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Generate citations from DOIs, URLs, files, or manual entry.
                </p>
                {!session && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      {remaining > 0 ? (
                        <>
                          {remaining} free citation{remaining !== 1 ? "s" : ""} remaining.{" "}
                          <Link href="/register" className="text-brand hover:underline">
                            Sign up for unlimited access.
                          </Link>
                        </>
                      ) : (
                        <span className="text-error">
                          No free citations remaining.{" "}
                          <Link href="/register" className="text-brand hover:underline">
                            Create an account to continue.
                          </Link>
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Citation style selector */}
              <StyleSelector value={style} onChange={setStyle} />

              {/* Input card */}
              <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden">
                <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} className="px-4 pt-2" />

                <div className="p-5 space-y-5">
                  {activeTab === "doi" && (
                    <div className="flex gap-3">
                      <Input
                        placeholder="e.g. 10.1038/s41586-020-2649-2"
                        value={doiInput}
                        onChange={(e) => setDoiInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleDOI()}
                        className="flex-1"
                      />
                      <Button onClick={() => handleDOI()} loading={loading} className="shrink-0">
                        Generate
                      </Button>
                    </div>
                  )}

                  {activeTab === "url" && (
                    <div className="flex gap-3">
                      <Input
                        placeholder="https://example.com/article"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleURL()}
                        className="flex-1"
                      />
                      <Button onClick={() => handleURL()} loading={loading} className="shrink-0">
                        Generate
                      </Button>
                    </div>
                  )}

                  {activeTab === "file" && (
                    <div className="space-y-4">
                      <FileUpload onFileSelect={setFile} />
                      <Button
                        onClick={() => handleFile()}
                        loading={loading}
                        disabled={!file}
                        className="w-full"
                      >
                        Generate from File
                      </Button>
                    </div>
                  )}

                  {activeTab === "manual" && (
                    <ManualEntryForm
                      onSubmit={(metadata) => handleManual(metadata)}
                      loading={loading}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RESULT PANEL (desktop only) ──────────────────────────────── */}
        <div
          className="hidden md:block flex-shrink-0"
          style={{
            width: showResultPanel ? "55%" : "0%",
            opacity: showResultPanel ? 1 : 0,
            transform: showResultPanel ? "translateX(0)" : "translateX(2rem)",
            overflow: showResultPanel ? "auto" : "hidden",
            transition: "width 300ms ease, opacity 300ms ease, transform 300ms ease",
          }}
        >
          <div className="p-8 space-y-4 min-h-full flex flex-col">
            {/* Panel header with close button */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Result
              </h2>
              <button
                onClick={() => setShowResult(false)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                aria-label="Close result panel"
              >
                <X size={13} />
                Close
              </button>
            </div>

            {/* Style switcher tabs */}
            <div className="flex flex-wrap gap-1.5">
              {CITATION_STYLES.map((s: any) => (
                <button
                  key={s}
                  onClick={() => handleStyleSwitch(s)}
                  disabled={loading}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50",
                    result?.style === s
                      ? "bg-brand text-white"
                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
                  )}
                >
                  {STYLE_LABELS[s as keyof typeof STYLE_LABELS]}
                </button>
              ))}
            </div>

            {/* Citation output */}
            {result && (
              <CitationOutput
                citation={result.citation}
                style={result.style}
                journalRank={result.journalRank}
                rankSource={result.rankSource}
                canMoveToLibrary={Boolean(session)}
                inLibrary={result.inLibrary}
                movingToLibrary={movingToLibrary}
                onMoveToLibrary={handleMoveToLibrary}
              />
            )}
          </div>
        </div>

        {/* ── RESULT (mobile — stacks below input) ─────────────────────── */}
        {result && (
          <div className="md:hidden w-full p-6 pt-0 space-y-4">
            {/* Style switcher */}
            <div className="flex flex-wrap gap-1.5">
              {CITATION_STYLES.map((s: any) => (
                <button
                  key={s}
                  onClick={() => handleStyleSwitch(s)}
                  disabled={loading}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50",
                    result.style === s
                      ? "bg-brand text-white"
                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
                  )}
                >
                  {STYLE_LABELS[s as keyof typeof STYLE_LABELS]}
                </button>
              ))}
            </div>
            <CitationOutput
              citation={result.citation}
              style={result.style}
              journalRank={result.journalRank}
              rankSource={result.rankSource}
              canMoveToLibrary={Boolean(session)}
              inLibrary={result.inLibrary}
              movingToLibrary={movingToLibrary}
              onMoveToLibrary={handleMoveToLibrary}
            />
          </div>
        )}
      </div>

      <Footer />

      {/* Guest limit modal */}
      <Modal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="Free limit reached"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            You have used all {GUEST_LIMIT} free citations. Create a free account to continue
            generating unlimited citations.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register"
              className="flex-1 flex items-center justify-center px-4 py-2.5 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors text-sm font-medium"
              onClick={() => setShowLimitModal(false)}
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="flex-1 flex items-center justify-center px-4 py-2.5 border border-[var(--border)] text-[var(--text-primary)] rounded-md hover:bg-[var(--border)] transition-colors text-sm"
              onClick={() => setShowLimitModal(false)}
            >
              Login
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
