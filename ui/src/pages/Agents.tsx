import { useState } from 'react';
import { Link } from 'react-router';
import { useAgents, useCreateAgent, useRunAgent } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { useTeamId } from '@/hooks/useTeamId';
import { Bot, Play, Plus, ChevronRight } from 'lucide-react';

const ROLE_ICONS: Record<string, string> = {
  architect: 'A', developer: 'D', reviewer: 'R', tester: 'T', general: 'G',
};

export function Agents() {
  const teamId = useTeamId();
  const { data: agents = [] } = useAgents(teamId);
  const createAgent = useCreateAgent(teamId);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('general');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createAgent.mutate({ name, role }, {
      onSuccess: () => { setName(''); setRole('general'); setShowForm(false); },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Agents</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          <Plus size={16} /> New Agent
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Architect Bot"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg outline-none"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                {['general', 'architect', 'developer', 'reviewer', 'tester'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createAgent.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              Create
            </button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <Link key={agent.id} to={`/agents/${agent.id}`} className="block group">
            <Card>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {ROLE_ICONS[agent.role] ?? 'G'}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{agent.name}</h3>
                    <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{agent.role}</p>
                  </div>
                </div>
                <StatusBadge status={agent.status} />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{agent.adapterType}</span>
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Bot size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No agents yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
