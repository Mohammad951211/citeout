"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Copy, Check, Library, Trash2, Download } from "lucide-react";
import toast from "react-hot-toast";

interface Citation {
  id: string;
  output: string;
  style: string;
  sourceType: string;
  journalRank?: string | null;
  createdAt: string;
}

const rankVariant: Record<string, "q1" | "q2" | "q3" | "q4" | "unranked"> = {
  Q1: "q1",
  Q2: "q2",
  Q3: "q3",
  Q4: "q4",
  UNRANKED: "unranked",
};

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cite/history?inLibrary=true&limit=100");
      if (!res.ok) {
        throw new Error("Failed to load library");
      }
      const data = (await res.json()) as { citations: Citation[] };
      setCitations(data.citations);
    } catch {
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchLibrary();
  }, [session, fetchLibrary]);

  const handleRemoveFromLibrary = async (id: string) => {
    const res = await fetch(`/api/cite/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inLibrary: false }),
    });

    if (!res.ok) {
      toast.error("Failed to remove citation from library");
      return;
    }

    setCitations((prev) => prev.filter((c) => c.id !== id));
    toast.success("Removed from library");
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this citation?")) return;
    const res = await fetch(`/api/cite/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete citation");
      return;
    }

    setCitations((prev) => prev.filter((c) => c.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success("Citation deleted");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = (format: string) => {
    const exportIds = selected.size
      ? [...selected]
      : citations.map((c) => c.id);

    if (!exportIds.length) {
      toast.error("No citations to export");
      return;
    }

    const ids = exportIds.join(",");
    const url = `/api/cite/export?format=${format}&ids=${ids}`;
    window.open(url, "_blank");
  };

  if (status === "loading") return null;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />
      <div className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Library</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {citations.length} saved citation{citations.length !== 1 ? "s" : ""}
                  {selected.size > 0 ? ` · ${selected.size} selected` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleExport("bibtex")}> 
                  <Download size={14} />
                  BibTeX
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("ris")}>
                  RIS
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("txt")}>
                  TXT
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">Loading...</div>
            ) : citations.length === 0 ? (
              <div className="border border-[var(--border)] rounded-lg p-10 bg-[var(--surface)] text-center">
                <Library size={28} className="mx-auto mb-3 text-[var(--text-secondary)]" />
                <p className="text-sm text-[var(--text-secondary)]">Your library is empty.</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Generate a citation and click "Move to Library" to save it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      setSelected(
                        selected.size === citations.length
                          ? new Set()
                          : new Set(citations.map((c) => c.id))
                      )
                    }
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {selected.size === citations.length ? "Clear selection" : "Select all"}
                  </button>
                </div>
                {citations.map((c) => (
                  <div key={c.id} className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface)]">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded"
                        aria-label="Select citation"
                      />
                      <Badge variant="default">{c.style}</Badge>
                      <Badge variant="default">{c.sourceType}</Badge>
                      <Badge variant={rankVariant[c.journalRank ?? "UNRANKED"] ?? "unranked"}>
                        {c.journalRank ?? "UNRANKED"}
                      </Badge>
                      <span className="ml-auto text-xs text-[var(--text-secondary)]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="citation-output text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words mb-3">
                      {c.output}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleCopy(c.id, c.output)}>
                        {copiedId === c.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        {copiedId === c.id ? "Copied" : "Copy"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleRemoveFromLibrary(c.id)}>
                        Remove from Library
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
