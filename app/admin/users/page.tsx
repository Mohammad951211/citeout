import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { citations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formatted = users.map((u: any) => ({
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
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {formatted.length} registered user{formatted.length !== 1 ? "s" : ""}
              </p>
            </div>
            <UsersTable users={formatted} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
