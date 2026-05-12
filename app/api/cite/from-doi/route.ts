import { NextRequest, NextResponse } from "next/server";
import { parseDOI } from "@/lib/parsers/doi";
import { formatCitation } from "@/lib/citation/formatter";
import { CitationStyle, RankSource } from "@/lib/citation/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJournalRank, scimagoRankToJournalRank } from "@/lib/services/journalRankService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { doi: string; style: CitationStyle };
    const { doi, style = "APA" } = body;

    if (!doi) {
      return NextResponse.json({ error: "DOI is required" }, { status: 400 });
    }

    const metadata = await parseDOI(doi);
    const output = formatCitation(metadata, style);

    // Auto-determine journal rank from Scimago
    const scimagoRank = metadata.journal
      ? await getJournalRank(metadata.journal)
      : "NA";
    const inferredRank = scimagoRankToJournalRank(scimagoRank);
    const journalRank = inferredRank ?? "UNRANKED";
    const rankSource: RankSource | undefined = inferredRank ? "INFERRED_FROM_JOURNAL" : undefined;

    const session = await getServerSession(authOptions);
    let citationId: string | null = null;
    if (session?.user) {
      const userId = (session.user as { id?: string }).id;
      const created = await prisma.citation.create({
        data: {
          userId,
          sourceType: "DOI",
          sourceInput: doi,
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
    const message = error instanceof Error ? error.message : "Failed to fetch DOI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
