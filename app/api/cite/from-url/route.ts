import { NextRequest, NextResponse } from "next/server";
import { parseURL } from "@/lib/parsers/url";
import { formatCitation } from "@/lib/citation/formatter";
import { CitationStyle, JournalRank, RankSource } from "@/lib/citation/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJournalRank, scimagoRankToJournalRank } from "@/lib/services/journalRankService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url: string; style: CitationStyle };
    const { url, style = "APA" } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const metadata = await parseURL(url);
    const output = formatCitation(metadata, style);

    // Prefer rank detected directly from ranking websites; otherwise infer from journal name.
    const scimagoRank = metadata.journal ? await getJournalRank(metadata.journal) : "NA";
    const autoRank = scimagoRankToJournalRank(scimagoRank);

    let journalRank: JournalRank;
    let rankSource: RankSource | undefined;

    if (metadata.journalRank) {
      journalRank = metadata.journalRank;
      rankSource = "DETECTED_FROM_PAGE";
    } else if (autoRank) {
      journalRank = autoRank;
      rankSource = "INFERRED_FROM_JOURNAL";
    } else {
      journalRank = "UNRANKED";
    }

    const session = await getServerSession(authOptions);
    let citationId: string | null = null;
    if (session?.user) {
      const userId = (session.user as { id?: string }).id;
      const created = await prisma.citation.create({
        data: {
          userId,
          sourceType: "URL",
          sourceInput: url,
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
    const message = error instanceof Error ? error.message : "Failed to fetch URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
