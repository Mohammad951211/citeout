"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CitationMetadata, Author } from "@/lib/citation/types";
import { Plus, Trash2 } from "lucide-react";

interface ManualEntryFormProps {
  onSubmit: (metadata: CitationMetadata) => void;
  loading?: boolean;
}

export function ManualEntryForm({ onSubmit, loading }: ManualEntryFormProps) {
  const [authors, setAuthors] = useState<Author[]>([{ firstName: "", lastName: "" }]);
  const [form, setForm] = useState({
    title: "",
    year: "",
    journal: "",
    volume: "",
    issue: "",
    pages: "",
    publisher: "",
    city: "",
    doi: "",
    url: "",
    accessDate: "",
    edition: "",
  });

  const updateAuthor = (i: number, field: keyof Author, value: string) => {
    setAuthors((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  };

  const addAuthor = () => setAuthors((prev) => [...prev, { firstName: "", lastName: "" }]);
  const removeAuthor = (i: number) => setAuthors((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const metadata: CitationMetadata = {
      title: form.title,
      authors: authors.filter((a) => a.lastName),
      year: form.year || undefined,
      journal: form.journal || undefined,
      volume: form.volume || undefined,
      issue: form.issue || undefined,
      pages: form.pages || undefined,
      publisher: form.publisher || undefined,
      city: form.city || undefined,
      doi: form.doi || undefined,
      url: form.url || undefined,
      accessDate: form.accessDate || undefined,
      edition: form.edition || undefined,
      sourceType: form.journal ? "journal" : form.publisher ? "book" : form.url ? "website" : "unknown",
    };
    onSubmit(metadata);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="title"
        label="Title *"
        placeholder="Article or book title"
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        required
      />

      {/* Authors */}
      <div>
        <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">Authors</label>
        <div className="space-y-2">
          {authors.map((author, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="First name"
                value={author.firstName ?? ""}
                onChange={(e) => updateAuthor(i, "firstName", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Last name *"
                value={author.lastName}
                onChange={(e) => updateAuthor(i, "lastName", e.target.value)}
                className="flex-1"
              />
              {authors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAuthor(i)}
                  className="p-2.5 text-[var(--text-secondary)] hover:text-error transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addAuthor}
          className="flex items-center gap-1.5 mt-2 text-sm text-brand hover:underline"
        >
          <Plus size={14} />
          Add author
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="year"
          label="Year"
          placeholder="2024"
          value={form.year}
          onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
        />
        <Input
          id="journal"
          label="Journal / Source"
          placeholder="Nature, Science..."
          value={form.journal}
          onChange={(e) => setForm((p) => ({ ...p, journal: e.target.value }))}
        />
        <Input
          id="volume"
          label="Volume"
          placeholder="12"
          value={form.volume}
          onChange={(e) => setForm((p) => ({ ...p, volume: e.target.value }))}
        />
        <Input
          id="issue"
          label="Issue"
          placeholder="3"
          value={form.issue}
          onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}
        />
        <Input
          id="pages"
          label="Pages"
          placeholder="100-115"
          value={form.pages}
          onChange={(e) => setForm((p) => ({ ...p, pages: e.target.value }))}
        />
        <Input
          id="publisher"
          label="Publisher"
          placeholder="Springer"
          value={form.publisher}
          onChange={(e) => setForm((p) => ({ ...p, publisher: e.target.value }))}
        />
        <Input
          id="doi"
          label="DOI"
          placeholder="10.1234/example"
          value={form.doi}
          onChange={(e) => setForm((p) => ({ ...p, doi: e.target.value }))}
        />
        <Input
          id="url"
          label="URL"
          placeholder="https://..."
          value={form.url}
          onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Generate Citation
      </Button>
    </form>
  );
}
