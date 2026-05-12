import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { AdminStats } from "@/components/admin/AdminStats";
import { CitationChart } from "@/components/admin/CitationChart";
import { UsersTable } from "@/components/admin/UsersTable";

async function getAdminData() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin/stats`, {
    cache: "no-store",
    headers: { Cookie: "" },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    totalUsers: number;
    totalCitations: number;
    newUsersWeek: number;
    newUsersMonth: number;
    citationsPerDay: { date: string; count: number }[];
    topUsers: { id: string; name: string | null; email: string; citationCount: number }[];
  }>;
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  // Fetch stats directly via Prisma for server component
  const { prisma } = await import("@/lib/prisma");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalCitations, newUsersWeek, newUsersMonth] = await Promise.all([
    prisma.user.count(),
    prisma.citation.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
  ]);

  const citations30Days: Array<{ createdAt: Date }> = await prisma.citation.findMany({
    where: { createdAt: { gte: monthAgo } },
    select: { createdAt: true },
  });

  const dailyMap: Record<string, number> = {};
  citations30Days.forEach((c: any) => {
    const day = c.createdAt.toISOString().split("T")[0];
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  });

  const citationsPerDay = Object.entries(dailyMap)
    .sort(([a, _countA]: [string, number], [b, _countB]: [string, number]) => a.localeCompare(b))
    .map(([date, count]: any) => ({ date, count }));

  const topUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { citations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const topUsersFormatted = topUsers.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    citationCount: u._count.citations,
  }));

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Navbar />
      <div className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        <div className="flex gap-8">
          <Sidebar />
          <div className="flex-1 min-w-0 space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Platform overview</p>
            </div>

            <AdminStats
              totalUsers={totalUsers}
              totalCitations={totalCitations}
              newUsersWeek={newUsersWeek}
              newUsersMonth={newUsersMonth}
            />

            <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] p-6">
              <h2 className="font-semibold text-[var(--text-primary)] mb-4">Citations (30 days)</h2>
              <CitationChart data={citationsPerDay} />
            </div>

            <div>
              <h2 className="font-semibold text-[var(--text-primary)] mb-4">
                Registered Users ({totalUsers})
              </h2>
              <UsersTable users={topUsersFormatted} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
