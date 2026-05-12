import { CitationMetadata } from "@/lib/citation/types";

interface CitationRecord {
  id: string;
  output: string;
  style: string;
  sourceType: string;
  metadata: CitationMetadata | null;
  createdAt: Date;
}

export function exportBibTeX(citations: CitationRecord[]): string {
  return citations
    .map((c: any, i: any) => {
      const meta = c.metadata;
      const key = `cite${i + 1}`;
      if (!meta) {
        return `@misc{${key},\n  note = {${c.output}}\n}`;
      }
      const authors = meta.authors
        .map((a: any) => (a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName))
        .join(" and ");
      const type = meta.journal ? "article" : meta.publisher ? "book" : "misc";

      let bib = `@${type}{${key},\n`;
      bib += `  author = {${authors}},\n`;
      bib += `  title = {${meta.title}},\n`;
      if (meta.year) bib += `  year = {${meta.year}},\n`;
      if (meta.journal) bib += `  journal = {${meta.journal}},\n`;
      if (meta.volume) bib += `  volume = {${meta.volume}},\n`;
      if (meta.issue) bib += `  number = {${meta.issue}},\n`;
      if (meta.pages) bib += `  pages = {${meta.pages}},\n`;
      if (meta.publisher) bib += `  publisher = {${meta.publisher}},\n`;
      if (meta.doi) bib += `  doi = {${meta.doi}},\n`;
      if (meta.url) bib += `  url = {${meta.url}},\n`;
      bib += `}`;
      return bib;
    })
    .join("\n\n");
}

export function exportRIS(citations: CitationRecord[]): string {
  return citations
    .map((c: any) => {
      const meta = c.metadata;
      if (!meta) return `TY  - GEN\nN1  - ${c.output}\nER  -`;

      const type = meta.journal ? "JOUR" : meta.publisher ? "BOOK" : "MISC";
      let ris = `TY  - ${type}\n`;
      ris += `TI  - ${meta.title}\n`;
      meta.authors.forEach((a: any) => {
        ris += `AU  - ${a.lastName}${a.firstName ? `, ${a.firstName}` : ""}\n`;
      });
      if (meta.year) ris += `PY  - ${meta.year}\n`;
      if (meta.journal) ris += `JO  - ${meta.journal}\n`;
      if (meta.volume) ris += `VL  - ${meta.volume}\n`;
      if (meta.issue) ris += `IS  - ${meta.issue}\n`;
      if (meta.pages) {
        const [start, end] = meta.pages.split(/[-–]/);
        ris += `SP  - ${start}\n`;
        if (end) ris += `EP  - ${end}\n`;
      }
      if (meta.publisher) ris += `PB  - ${meta.publisher}\n`;
      if (meta.doi) ris += `DO  - ${meta.doi}\n`;
      if (meta.url) ris += `UR  - ${meta.url}\n`;
      ris += `ER  -`;
      return ris;
    })
    .join("\n\n");
}

export function exportPlainText(citations: CitationRecord[]): string {
  return citations.map((c: any, i: any) => `${i + 1}. ${c.output}`).join("\n\n");
}
