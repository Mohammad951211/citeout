"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { Trash2, Download, Copy, Check, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Citation {
  id: string;
  output: string;
  style: string;
  sourceType: string;
  journalRank?: string | null;
  sourceInput: string;
  createdAt: string;
}

const rankVariant: Record<string, "q1" | "q2" | "q3" | "q4" | "unranked"> = {
  Q1: "q1", Q2: "q2", Q3: "q3", Q4: "q4", UNRANKED: "unranked",
};

const STYLE_OPTIONS = [
  { value: "", label: "All Styles" },
  { value: "APA", label: "APA" },
  { value: "MLA", label: "MLA" },
  { value: "CHICAGO", label: "Chicago" },
  { value: "IEEE", label: "IEEE" },
  { value: "HARVARD", label: "Harvard" },
  { value: "VANCOUVER", label: "Vancouver" },
];

const RANK_OPTIONS = [
  { value: "", label: "All Ranks" },
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
  { value: "UNRANKED", label: "Unranked" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "DOI", label: "DOI" },
  { value: "URL", label: "URL" },
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "DOCX" },
  { value: "MANUAL", label: "Manual" },
];

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("");
  const [rank, setRank] = useState("");
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchCitations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (style) params.set("style", style);
    if (rank) params.set("rank", rank);
    if (source) params.set("sourceType", source);
    params.set("limit", "50");
    try {
      const res = await fetch(`/api/cite/history?${params}`);
      const data = (await res.json()) as { citations: Citation[]; total: number };
      setCitations(data.citations);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [query, style, rank, source]);

  useEffect(() => {
    if (session) fetchCitations();
  }, [session, fetchCitations]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this citation?")) return;
    const res = await fetch(`/api/cite/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCitations((prev) => prev.filter((c: any) => c.id !== id));
      setSelected((prev) => { prev.delete(id); return new Set(prev); });
      toast.success("Citation deleted");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} citation(s)?`)) return;
    await Promise.all([...selected].map((id: any) => fetch(`/api/cite/${id}`, { method: "DELETE" })));
    setCitations((prev) => prev.filter((c: any) => !selected.has(c.id)));
    setSelected(new Set());
    toast.success("Citations deleted");
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (format: string) => {
    const ids = selected.size ? [...selected].join(",") : "";
    const url = `/api/cite/export?format=${format}${ids ? `&ids=${ids}` : ""}`;
    window.open(url, "_blank");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Citation History</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{total} citation{total !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                    <Trash2 size={14} />
                    Delete ({selected.size})
                  </Button>
                )}
                <div className="relative">
                  <Button variant="secondary" size="sm" onClick={() => {}}>
                    <Download size={14} />
                    Export
                  </Button>
                  {/* Simple dropdown */}
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block">
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleExport("bibtex")}>BibTeX</Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("ris")}>RIS</Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("txt")}>TXT</Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search size={16} className="text-[var(--text-secondary)] shrink-0" />
                <Input
                  placeholder="Search citations..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                options={STYLE_OPTIONS}
                className="w-36"
              />
              <Select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                options={RANK_OPTIONS}
                className="w-36"
              />
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                options={SOURCE_OPTIONS}
                className="w-36"
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
                Loading...
              </div>
            ) : citations.length === 0 ? (
              <div className="border border-[var(--border)] rounded-lg p-10 bg-[var(--surface)] text-center text-[var(--text-secondary)]">
                No citations found.
              </div>
            ) : (
              <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden">
                <Table>
                  <Thead>
                    <Tr>
                      <Th className="w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === citations.length}
                          onChange={(e) =>
                            setSelected(e.target.checked ? new Set(citations.map((c: any) => c.id)) : new Set())
                          }
                          className="rounded"
                        />
                      </Th>
                      <Th>Citation</Th>
                      <Th className="w-20">Style</Th>
                      <Th className="w-20">Source</Th>
                      <Th className="w-20">Rank</Th>
                      <Th className="w-28">Date</Th>
                      <Th className="w-20">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {citations.map((c: any) => (
                      <Tr key={c.id}>
                        <Td>
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded"
                          />
                        </Td>
                        <Td>
                          <p className="citation-output text-xs line-clamp-2 text-[var(--text-primary)]">
                            {c.output}
                          </p>
                        </Td>
                        <Td>
                          <Badge variant="default">{c.style}</Badge>
                        </Td>
                        <Td>
                          <span className="text-xs text-[var(--text-secondary)]">{c.sourceType}</span>
                        </Td>
                        <Td>
                          <Badge variant={rankVariant[c.journalRank ?? "UNRANKED"] ?? "unranked"}>
                            {c.journalRank ?? "UNRANKED"}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(c.id, c.output)}
                              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              title="Copy"
                            >
                              {copiedId === c.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-error transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
