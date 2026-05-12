/**
 * POST /api/tools/save
 *
 * Persists a Research Tool result to the user's library.
 * Requires an active session — guests cannot save results.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ToolType = "TRANSLATE" | "PARAPHRASE" | "AI_DETECT" | "GRAMMAR" | "HUMANIZE";

interface SaveRequest {
  toolType: ToolType;
  inputText: string;
  output: string;
  metadata?: Record<string, unknown>; // e.g. { targetLang, score, changes }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in to save results." },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Session user ID missing." }, { status: 401 });
    }

    const body = (await req.json()) as SaveRequest;
    const { toolType, inputText, output, metadata } = body;

    if (!toolType || !inputText?.trim() || !output?.trim()) {
      return NextResponse.json(
        { error: "toolType, inputText, and output are required." },
        { status: 400 }
      );
    }

    const record = await prisma.researchToolUsage.create({
      data: {
        userId,
        toolType,
        inputText,
        output,
        metadata: metadata ?? undefined,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ success: true, id: record.id, createdAt: record.createdAt });
  } catch (error) {
    console.error("Tool save error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
