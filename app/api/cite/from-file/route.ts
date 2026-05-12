import { NextRequest, NextResponse } from "next/server";
import { formatCitation } from "@/lib/citation/formatter";
import { CitationStyle, RankSource } from "@/lib/citation/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJournalRank, scimagoRankToJournalRank } from "@/lib/services/journalRankService";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const style = (formData.get("style") as CitationStyle) ?? "APA";

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name.toLowerCase();

    let metadata;
    let sourceType: "PDF" | "DOCX";

    if (filename.endsWith(".pdf")) {
      const { parsePDF } = await import("@/lib/parsers/pdf");
      metadata = await parsePDF(buffer);
      sourceType = "PDF";
    } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      const { parseDOCX } = await import("@/lib/parsers/docx");
      metadata = await parseDOCX(buffer);
      sourceType = "DOCX";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF or DOCX files." },
        { status: 400 }
      );
    }

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
          sourceType,
          sourceInput: file.name,
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
    const message = error instanceof Error ? error.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
