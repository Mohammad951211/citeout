interface StatCard {
  label: string;
  value: number | string;
  description?: string;
}

interface StatsCardsProps {
  stats: StatCard[];
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="border border-[var(--border)] rounded-lg p-5 bg-[var(--surface)]"
        >
          <p className="text-sm text-[var(--text-secondary)] mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          {stat.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">{stat.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
