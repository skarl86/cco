import { useTeams, useCreateTeam } from '@/api/queries';
import { Card } from '@/components/ui/Card';
import { useState } from 'react';

export function SettingsPage() {
  const { data: teams = [] } = useTeams();
  const createTeam = useCreateTeam();
  const [name, setName] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createTeam.mutate({ name }, { onSuccess: () => setName('') });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Teams</h3>
        {teams.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {teams.map((team: any) => (
              <li key={team.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-800">{team.name}</span>
                <span className="text-xs font-mono text-gray-400">{team.id.slice(0, 16)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No teams. Create one to get started.</p>
        )}

        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={createTeam.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Create Team
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">About</h3>
        <p className="text-sm text-gray-600">CCO v0.1.0 — Claude Code Orchestrator</p>
        <p className="text-xs text-gray-400 mt-1">AI agent team orchestration platform</p>
      </Card>
    </div>
  );
}
