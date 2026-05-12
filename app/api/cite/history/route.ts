import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const { searchParams } = new URL(req.url);
    const style = searchParams.get("style");
    const sourceType = searchParams.get("sourceType");
    const rank = searchParams.get("rank");
    const query = searchParams.get("q");
    const inLibrary = searchParams.get("inLibrary");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

    const where: Record<string, unknown> = { userId };
    if (style) where.style = style;
    if (sourceType) where.sourceType = sourceType;
    if (rank) where.journalRank = rank;
    if (inLibrary === "true") where.isInLibrary = true;
    if (inLibrary === "false") where.isInLibrary = false;
    if (query) {
      where.OR = [
        { output: { contains: query, mode: "insensitive" } },
        { sourceInput: { contains: query, mode: "insensitive" } },
      ];
    }

    const [citations, total] = await Promise.all([
      prisma.citation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.citation.count({ where }),
    ]);

    const normalizedCitations = citations.map((citation: any) => ({
      ...citation,
      journalRank: citation.journalRank ?? "UNRANKED",
    }));

    return NextResponse.json({ citations: normalizedCitations, total, page, limit });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
