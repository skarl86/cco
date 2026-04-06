import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useAgent, useRuns, useUpdateTask } from '@/api/queries.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { useTeamId } from '@/hooks/useTeamId.js';
import {
  ArrowLeft, Bot, Clock, DollarSign, Shield, FileText,
  Play, Pencil, X, Check,
} from 'lucide-react';

const cardStyle = {
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--color-border)',
};

const inputStyle = {
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};

export default function AgentDetail() {
  const { agentId } = useParams();
  const teamId = useTeamId();
  const { data: agent, isLoading } = useAgent(teamId, agentId ?? '');
  const { data: allRuns = [] } = useRuns(teamId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  const agentRuns = allRuns
    .filter((r: any) => r.agentId === agentId)
    .slice(0, 10);

  function startEditing() {
    setEditName(agent?.name ?? '');
    setEditRole(agent?.role ?? '');
    setEditing(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
        <div className="h-48 rounded-xl animate-pulse" style={{ background: 'var(--color-border)' }} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <Bot size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Agent not found.</p>
        <Link
          to="/agents"
          className="inline-flex items-center gap-1 mt-4 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          <ArrowLeft size={14} /> Back to agents
        </Link>
      </div>
    );
  }

  const budget = agent.monthlyBudget ?? 0;
  const spent = agent.monthlySpent ?? 0;
  const budgetPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const permissions = agent.permissions ?? [];
  const instructions = agent.instructions ?? agent.systemPrompt ?? '';

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/agents"
        className="inline-flex items-center gap-1 text-sm font-medium mb-6"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={14} /> All agents
      </Link>

      {/* Header */}
      <div
        className="rounded-xl p-5 mb-6 flex items-start justify-between"
        style={cardStyle}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
          >
            {(agent.name ?? 'A')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                {agent.name}
              </h2>
              <StatusBadge status={agent.status} />
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span className="capitalize">{agent.role ?? 'general'}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {agent.adapterType}
              </span>
              <span className="font-mono text-xs">{agent.id.slice(0, 16)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={startEditing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}
        >
          <Pencil size={14} /> Edit
        </button>
      </div>

      {/* Edit form overlay */}
      {editing && (
        <div
          className="rounded-xl p-5 mb-6"
          style={cardStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Edit Agent
            </h3>
            <button onClick={() => setEditing(false)} className="p-1 rounded-md" style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
            }}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Name
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={inputStyle}
              >
                {['general', 'architect', 'developer', 'reviewer', 'tester'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm rounded-lg font-medium"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                <Check size={14} /> Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instructions */}
          {instructions && (
            <section className="rounded-xl p-5" style={cardStyle}>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                <FileText size={14} /> Instructions
              </h3>
              <pre
                className="text-sm whitespace-pre-wrap leading-relaxed rounded-lg p-4"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
              >
                {instructions}
              </pre>
            </section>
          )}

          {/* Recent runs */}
          <section className="rounded-xl overflow-hidden" style={cardStyle}>
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                <Play size={14} /> Recent Runs
              </h3>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {agentRuns.length} shown
              </span>
            </div>
            {agentRuns.length === 0 ? (
              <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>No runs for this agent yet.</p>
            ) : (
              <ul>
                {agentRuns.map((run: any, i: number) => (
                  <li
                    key={run.id}
                    className="px-5 py-3 flex items-center justify-between"
                    style={i < agentRuns.length - 1 ? { borderBottom: '1px solid var(--color-border)' } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {run.id.slice(0, 12)}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {run.finishedAt && run.startedAt && (
                        <span className="font-mono">
                          {((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s
                        </span>
                      )}
                      <span className="tabular-nums">
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Budget */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
              <DollarSign size={14} /> Budget
            </h3>
            <div className="mb-3">
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
                  ${spent.toFixed(2)}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  / ${budget.toFixed(2)}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--color-bg-alt)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${budgetPct}%`,
                    background: budgetPct > 90 ? 'var(--color-error)' : budgetPct > 70 ? 'var(--color-warning)' : 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {budgetPct.toFixed(0)}% of monthly budget used
            </p>
          </section>

          {/* Permissions */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              <Shield size={14} /> Permissions
            </h3>
            {permissions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No permissions configured.</p>
            ) : (
              <ul className="space-y-1.5">
                {permissions.map((perm: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm font-mono px-2.5 py-1 rounded-md"
                    style={{ background: 'var(--color-bg-alt)', color: 'var(--color-text-secondary)' }}
                  >
                    {perm}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Metadata */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              <Clock size={14} /> Metadata
            </h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Created', agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'],
                ['Updated', agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString() : '—'],
                ['Adapter', agent.adapterType ?? '—'],
                ['Total runs', String(agentRuns.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
                  <dd className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
