import { useMonthlySpend, useCostsByAgent, useCosts } from '@/api/queries';
import { useTeamId } from '@/hooks/useTeamId';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function Costs() {
  const teamId = useTeamId();
  const { data: monthly, isLoading: monthlyLoading } = useMonthlySpend(teamId);
  const { data: byAgent = [], isLoading: agentLoading } = useCostsByAgent(teamId);
  const { data: costEvents = [], isLoading: eventsLoading } = useCosts(teamId);

  const totalAgentCost = byAgent.reduce((sum: number, a: any) => sum + (a.totalCost ?? 0), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
        Costs
      </h2>

      {/* Monthly spend card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div
          className="rounded-xl border p-5 col-span-1"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-accent-light)' }}
            >
              <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Monthly Spend
            </h3>
          </div>
          {monthlyLoading ? (
            <div
              className="h-9 w-24 rounded animate-pulse"
              style={{ background: 'var(--color-bg-alt)' }}
            />
          ) : (
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {formatCents(monthly?.totalCents ?? 0)}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {monthly?.month ?? 'Current month'}
          </p>
        </div>

        <div
          className="rounded-xl border p-5 col-span-1"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-success-light)' }}
            >
              <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
            </div>
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Active Agents
            </h3>
          </div>
          {agentLoading ? (
            <div
              className="h-9 w-12 rounded animate-pulse"
              style={{ background: 'var(--color-bg-alt)' }}
            />
          ) : (
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {byAgent.length}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            agents with cost data
          </p>
        </div>

        <div
          className="rounded-xl border p-5 col-span-1"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-warning-light)' }}
            >
              <Clock size={16} style={{ color: 'var(--color-warning)' }} />
            </div>
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Total Events
            </h3>
          </div>
          {eventsLoading ? (
            <div
              className="h-9 w-12 rounded animate-pulse"
              style={{ background: 'var(--color-bg-alt)' }}
            />
          ) : (
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {costEvents.length}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            cost events recorded
          </p>
        </div>
      </div>

      {/* Per-agent breakdown */}
      <div
        className="rounded-xl border overflow-hidden mb-8"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cost by Agent
          </h3>
        </div>

        {agentLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-3.5 flex-1 rounded" style={{ background: 'var(--color-bg-alt)' }} />
                <div className="h-3.5 w-16 rounded" style={{ background: 'var(--color-bg-alt)' }} />
              </div>
            ))}
          </div>
        ) : byAgent.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No agent cost data yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th
                  className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)' }}
                >
                  Agent
                </th>
                <th
                  className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)' }}
                >
                  Cost
                </th>
                <th
                  className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider w-32"
                  style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)' }}
                >
                  Share
                </th>
                <th
                  className="px-5 py-3 text-xs font-semibold uppercase tracking-wider w-48"
                  style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)' }}
                >
                  Distribution
                </th>
              </tr>
            </thead>
            <tbody>
              {byAgent.map((agent: any) => {
                const pct = totalAgentCost > 0
                  ? ((agent.totalCost / totalAgentCost) * 100).toFixed(1)
                  : '0.0';

                return (
                  <tr
                    key={agent.agentId ?? agent.name}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {agent.name ?? agent.agentId?.slice(0, 16) ?? 'Unknown'}
                    </td>
                    <td
                      className="px-5 py-3 text-right font-mono tabular-nums"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatCents(agent.totalCost ?? 0)}
                    </td>
                    <td
                      className="px-5 py-3 text-right font-mono tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {pct}%
                    </td>
                    <td className="px-5 py-3">
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--color-bg-alt)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: 'var(--color-accent)',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent cost events */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Recent Cost Events
          </h3>
        </div>

        {eventsLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-3.5 flex-1 rounded" style={{ background: 'var(--color-bg-alt)' }} />
              </div>
            ))}
          </div>
        ) : costEvents.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No cost events recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Provider', 'Model', 'Tokens', 'Cost', 'Time'].map((label) => (
                  <th
                    key={label}
                    className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${
                      label === 'Cost' || label === 'Time' || label === 'Tokens' ? 'text-right' : 'text-left'
                    }`}
                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-alt)' }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costEvents.slice(0, 50).map((event: any, i: number) => (
                <tr
                  key={event.id ?? i}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-5 py-3" style={{ color: 'var(--color-text)' }}>
                    {event.provider ?? '—'}
                  </td>
                  <td
                    className="px-5 py-3 font-mono text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {event.model ?? '—'}
                  </td>
                  <td
                    className="px-5 py-3 text-right font-mono tabular-nums"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {(event.totalTokens ?? event.tokens ?? 0).toLocaleString()}
                  </td>
                  <td
                    className="px-5 py-3 text-right font-mono tabular-nums font-medium"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {formatCents(event.costCents ?? event.cost ?? 0)}
                  </td>
                  <td
                    className="px-5 py-3 text-right tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {event.createdAt ? relativeTime(event.createdAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
