interface AdminStatsProps {
  totalUsers: number;
  totalCitations: number;
  newUsersWeek: number;
  newUsersMonth: number;
}

export function AdminStats({ totalUsers, totalCitations, newUsersWeek, newUsersMonth }: AdminStatsProps) {
  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Total Citations", value: totalCitations },
    { label: "New Users (7d)", value: newUsersWeek },
    { label: "New Users (30d)", value: newUsersMonth },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border border-[var(--border)] rounded-lg p-5 bg-[var(--surface)]"
        >
          <p className="text-sm text-[var(--text-secondary)] mb-1">{s.label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
