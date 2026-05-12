/**
 * GET  /api/tools/history          — fetch saved tool results (paginated)
 * DELETE /api/tools/history?id=… — delete a saved result
 *
 * Both require an active session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;

    const [records, total] = await Promise.all([
      prisma.researchToolUsage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          toolType: true,
          inputText: true,
          output: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.researchToolUsage.count({ where: { userId } }),
    ]);

    return NextResponse.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Tool history GET error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Record id is required." }, { status: 400 });
    }

    // Ensure the record belongs to the requesting user before deleting
    const record = await prisma.researchToolUsage.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    await prisma.researchToolUsage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tool history DELETE error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
