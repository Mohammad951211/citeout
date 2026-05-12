import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentCitations } from "@/components/dashboard/RecentCitations";
import Link from "next/link";
import { Plus, Shield } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id!;

  const [totalCitations, recentCitations] = await Promise.all([
    prisma.citation.count({ where: { userId } }),
    prisma.citation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const styleBreakdown = await prisma.citation.groupBy({
    by: ["style"],
    where: { userId },
    _count: { style: true },
  });

  const topStyle = styleBreakdown.reduce(
    (top: any, s: any) => (s._count.style > (top._count?.style ?? 0) ? s : top),
    styleBreakdown[0]
  );

  const stats = [
    { label: "Total Citations", value: totalCitations },
    { label: "Top Style", value: topStyle?.style ?? "—" },
    { label: "This Week", value: await prisma.citation.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }) },
    { label: "Styles Used", value: styleBreakdown.length },
  ];

  const citationsForDisplay = recentCitations.map((c: any) => ({
    ...c,
    journalRank: c.journalRank ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />
      <div className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1 min-w-0 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                  {(session.user as { role?: string }).role === "ADMIN" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
                      <Shield size={12} />
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Welcome back, {session.user?.name ?? session.user?.email}
                </p>
              </div>
              <Link
                href="/cite"
                className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                New Citation
              </Link>
            </div>

            <StatsCards stats={stats} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[var(--text-primary)]">Recent Citations</h2>
                <Link href="/history" className="text-sm text-brand hover:underline">
                  View all →
                </Link>
              </div>
              <RecentCitations citations={citationsForDisplay} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
