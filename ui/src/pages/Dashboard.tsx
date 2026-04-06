import { useDashboard, useRuns, useMonthlySpend } from '@/api/queries';
import { Card, CardTitle, CardValue } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';
import { Bot, ListTodo, Play, DollarSign } from 'lucide-react';

export function Dashboard() {
  const teamId = useTeamId();
  const { data: dashboard } = useDashboard(teamId);
  const { data: runs = [] } = useRuns(teamId);
  const { data: monthlySpend } = useMonthlySpend(teamId);

  const recentRuns = runs.slice(0, 8);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<Bot size={18} />}
          label="Active Agents"
          value={dashboard?.agents?.running ?? 0}
          sub={`/ ${dashboard?.agents?.total ?? 0}`}
          accentVar="--color-accent"
        />
        <MetricCard
          icon={<ListTodo size={18} />}
          label="Open Tasks"
          value={(dashboard?.tasks?.todo ?? 0) + (dashboard?.tasks?.inProgress ?? 0) + (dashboard?.tasks?.inReview ?? 0)}
          sub={`of ${dashboard?.tasks?.total ?? 0}`}
          accentVar="--color-warning"
        />
        <MetricCard
          icon={<Play size={18} />}
          label="Runs Today"
          value={dashboard?.runs?.todayCount ?? 0}
          sub={`${dashboard?.runs?.total ?? 0} total`}
          accentVar="--color-success"
        />
        <MetricCard
          icon={<DollarSign size={18} />}
          label="Monthly Spend"
          value={`$${((monthlySpend?.totalCents ?? 0) / 100).toFixed(2)}`}
          accentVar="--color-error"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <div
          className="rounded-xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Recent Runs</h3>
          </div>
          {recentRuns.length === 0 ? (
            <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>No runs yet</p>
          ) : (
            <ul>
              {recentRuns.map((run: any, i: number) => (
                <li
                  key={run.id}
                  className="px-5 py-3 flex items-center justify-between"
                  style={i < recentRuns.length - 1 ? { borderBottom: '1px solid var(--color-border)' } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>{run.id.slice(0, 12)}</span>
                    <StatusBadge status={run.status} />
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Stats */}
        <div
          className="rounded-xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Overview</h3>
          </div>
          <div className="p-5 space-y-3">
            <StatRow label="Pending Approvals" value={dashboard?.approvals?.pending ?? 0} />
            <StatRow label="Active Routines" value={dashboard?.routines?.active ?? 0} />
            <StatRow label="Projects" value={dashboard?.projects?.active ?? 0} />
            <StatRow label="Completed Runs" value={dashboard?.runs?.completed ?? 0} />
            <StatRow label="Failed Runs" value={dashboard?.runs?.failed ?? 0} warn />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, accentVar }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accentVar: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: `var(${accentVar})` }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
        {value}
        {sub && <span className="text-base font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

function StatRow({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: warn && value > 0 ? 'var(--color-error)' : 'var(--color-text)' }}
      >
        {value}
      </span>
    </div>
  );
}
