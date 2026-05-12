import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCitation } from "@/lib/citation/formatter";
import { parseDOI } from "@/lib/parsers/doi";
import { parseURL } from "@/lib/parsers/url";
import { CitationMetadata, CitationStyle, JournalRank, RankSource } from "@/lib/citation/types";
import { getJournalRank, scimagoRankToJournalRank } from "@/lib/services/journalRankService";

interface CiteRequest {
  style: CitationStyle;
  sourceType: "DOI" | "URL" | "MANUAL";
  sourceInput: string;
  metadata?: CitationMetadata;
  journalRank?: JournalRank;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = (await req.json()) as CiteRequest;
    const { style, sourceType, sourceInput, metadata: manualMeta, journalRank: requestedRank } = body;

    if (!style || !sourceType || !sourceInput) {
      return NextResponse.json(
        { error: "style, sourceType, and sourceInput are required" },
        { status: 400 }
      );
    }

    let metadata: CitationMetadata;

    switch (sourceType) {
      case "DOI":
        metadata = await parseDOI(sourceInput);
        break;
      case "URL":
        metadata = await parseURL(sourceInput);
        break;
      case "MANUAL":
        if (!manualMeta) {
          return NextResponse.json({ error: "Metadata required for MANUAL type" }, { status: 400 });
        }
        metadata = manualMeta;
        break;
      default:
        return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
    }

    const output = formatCitation(metadata, style);

    // Rank priority: user-requested > rank extracted from source page > inferred from journal name.
    const scimagoRank = metadata.journal ? await getJournalRank(metadata.journal) : "NA";
    const autoRank = scimagoRankToJournalRank(scimagoRank);

    let journalRank: JournalRank;
    let rankSource: RankSource | undefined;

    if (requestedRank) {
      journalRank = requestedRank;
      rankSource = "MANUAL";
    } else if (metadata.journalRank) {
      journalRank = metadata.journalRank;
      rankSource = "DETECTED_FROM_PAGE";
    } else if (autoRank) {
      journalRank = autoRank;
      rankSource = "INFERRED_FROM_JOURNAL";
    } else {
      journalRank = "UNRANKED";
    }

    let citationId: string | null = null;
    if (session?.user) {
      const userId = (session.user as { id?: string }).id;
      const created = await prisma.citation.create({
        data: {
          userId,
          sourceType,
          sourceInput,
          style,
          output,
          journalRank,
          metadata: metadata as object,
        },
        select: { id: true },
      });
      citationId = created.id;
    }

    return NextResponse.json({ citation: output, metadata, style, journalRank, rankSource, citationId });
  } catch (error) {
    console.error("Cite error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate citation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
