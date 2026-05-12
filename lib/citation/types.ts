export interface CitationMetadata {
  title: string;
  authors: Author[];
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  edition?: string;
  city?: string;
  website?: string;
  description?: string;
  sourceType?: "journal" | "book" | "website" | "report" | "unknown";
  journalRank?: JournalRank;
}

export interface Author {
  firstName?: string;
  lastName: string;
  suffix?: string;
}

export type CitationStyle = "APA" | "MLA" | "CHICAGO" | "IEEE" | "HARVARD" | "VANCOUVER";

export type JournalRank = "Q1" | "Q2" | "Q3" | "Q4" | "UNRANKED";

export type RankSource = "MANUAL" | "DETECTED_FROM_PAGE" | "INFERRED_FROM_JOURNAL";

export interface GenerateCitationRequest {
  style: CitationStyle;
  sourceType: "DOI" | "URL" | "PDF" | "DOCX" | "MANUAL" | "BIBTEX";
  sourceInput: string;
  journalRank?: JournalRank;
  metadata?: CitationMetadata;
}

export interface GenerateCitationResponse {
  citation: string;
  metadata: CitationMetadata;
  style: CitationStyle;
  journalRank?: JournalRank;
  rankSource?: RankSource;
}
