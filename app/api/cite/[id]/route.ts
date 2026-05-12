import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id?: string }).id!;
    const body = (await req.json()) as { inLibrary?: boolean };

    if (typeof body.inLibrary !== "boolean") {
      return NextResponse.json({ error: "inLibrary must be a boolean" }, { status: 400 });
    }

    const citation = await prisma.citation.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!citation) {
      return NextResponse.json({ error: "Citation not found" }, { status: 404 });
    }

    const updated = await prisma.citation.update({
      where: { id },
      data: { isInLibrary: body.inLibrary },
      select: { id: true, isInLibrary: true },
    });

    return NextResponse.json({ citation: updated });
  } catch (error) {
    console.error("Update citation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id?: string }).id!;

    const citation = await prisma.citation.findFirst({
      where: { id, userId },
    });

    if (!citation) {
      return NextResponse.json({ error: "Citation not found" }, { status: 404 });
    }

    await prisma.citation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete citation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
