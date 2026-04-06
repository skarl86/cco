import { useState } from 'react';
import { useAgents, useCreateAgent, useRunAgent } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { useTeamId } from '@/hooks/useTeamId';
import { Bot, Play, Plus } from 'lucide-react';

const ROLE_ICONS: Record<string, string> = {
  architect: 'A',
  developer: 'D',
  reviewer: 'R',
  tester: 'T',
  general: 'G',
};

export function Agents() {
  const teamId = useTeamId();
  const { data: agents = [] } = useAgents(teamId);
  const createAgent = useCreateAgent(teamId);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('general');
  const [runPrompt, setRunPrompt] = useState<{ agentId: string; prompt: string } | null>(null);

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
        <h2 className="text-2xl font-bold text-gray-900">Agents</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Agent
        </button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Architect Bot"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['general', 'architect', 'developer', 'reviewer', 'tester'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createAgent.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <Card key={agent.id} className="relative group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {ROLE_ICONS[agent.role] ?? 'G'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{agent.role}</p>
                </div>
              </div>
              <StatusBadge status={agent.status} />
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-mono">{agent.adapterType}</span>
              <RunButton teamId={teamId} agentId={agent.id} />
            </div>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Bot size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No agents yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}

function RunButton({ teamId, agentId }: { teamId: string; agentId: string }) {
  const runAgent = useRunAgent(teamId, agentId);
  const [prompt, setPrompt] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Play size={12} /> Run
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        runAgent.mutate({ prompt }, { onSuccess: () => { setPrompt(''); setOpen(false); } });
      }}
      className="flex gap-2"
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt..."
        className="w-40 px-2 py-1 text-xs border border-gray-200 rounded"
        autoFocus
      />
      <button type="submit" disabled={runAgent.isPending} className="text-xs text-blue-600 font-medium">
        {runAgent.isPending ? '...' : 'Go'}
      </button>
    </form>
  );
}
