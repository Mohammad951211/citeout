import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportBibTeX, exportRIS, exportPlainText } from "@/lib/utils/export";
import { CitationMetadata } from "@/lib/citation/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "txt";
    const ids = searchParams.get("ids")?.split(",") ?? [];

    const where = ids.length
      ? { userId, id: { in: ids } }
      : { userId };

    const citations = await prisma.citation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const records = citations.map((c: any) => ({
      id: c.id,
      output: c.output,
      style: c.style,
      sourceType: c.sourceType,
      metadata: c.metadata as CitationMetadata | null,
      createdAt: c.createdAt,
    }));

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "bibtex":
        content = exportBibTeX(records);
        contentType = "application/x-bibtex";
        filename = "citations.bib";
        break;
      case "ris":
        content = exportRIS(records);
        contentType = "application/x-research-info-systems";
        filename = "citations.ris";
        break;
      default:
        content = exportPlainText(records);
        contentType = "text/plain";
        filename = "citations.txt";
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
