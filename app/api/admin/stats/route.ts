import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalCitations, newUsersWeek, newUsersMonth] = await Promise.all([
      prisma.user.count(),
      prisma.citation.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);

    // Citations per day for the last 30 days
    const citations30Days = await prisma.citation.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { createdAt: true },
    });

    const dailyMap: Record<string, number> = {};
    citations30Days.forEach((c: any) => {
      const day = c.createdAt.toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    });

    const citationsPerDay = Object.entries(dailyMap)
      .sort(([a]: any, [b]: any) => a.localeCompare(b))
      .map(([date, count]: any) => ({ date, count }));

    // Top users
    const topUsers = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { citations: true } },
      },
      orderBy: { citations: { _count: "desc" } },
    });

    return NextResponse.json({
      totalUsers,
      totalCitations,
      newUsersWeek,
      newUsersMonth,
      citationsPerDay,
      topUsers: topUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        citationCount: u._count.citations,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
