import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GUEST_LIMIT = 5;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get("fingerprint");

    if (!fingerprint) {
      return NextResponse.json({ error: "Fingerprint required" }, { status: 400 });
    }

    const usage = await prisma.guestUsage.findUnique({ where: { fingerprint } });
    const count = usage?.count ?? 0;

    return NextResponse.json({
      count,
      remaining: Math.max(0, GUEST_LIMIT - count),
      limit: GUEST_LIMIT,
      exceeded: count >= GUEST_LIMIT,
    });
  } catch (error) {
    console.error("Guest usage GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { fingerprint?: string };
    const { fingerprint } = body;

    if (!fingerprint) {
      return NextResponse.json({ error: "Fingerprint required" }, { status: 400 });
    }

    const usage = await prisma.guestUsage.upsert({
      where: { fingerprint },
      update: {
        count: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        fingerprint,
        count: 1,
        lastUsedAt: new Date(),
      },
    });

    const exceeded = usage.count >= GUEST_LIMIT;

    return NextResponse.json({
      count: usage.count,
      remaining: Math.max(0, GUEST_LIMIT - usage.count),
      limit: GUEST_LIMIT,
      exceeded,
    });
  } catch (error) {
    console.error("Guest usage POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
