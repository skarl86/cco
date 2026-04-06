import { useAgents, useRuns, useTasks } from '@/api/queries';
import { Card, CardTitle, CardValue } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';

export function Dashboard() {
  const teamId = useTeamId();
  const { data: agents = [] } = useAgents(teamId);
  const { data: tasks = [] } = useTasks(teamId);
  const { data: runs = [] } = useRuns(teamId);

  const activeAgents = agents.filter((a: any) => a.status === 'running').length;
  const openTasks = tasks.filter((t: any) => !['done', 'cancelled'].includes(t.status)).length;
  const recentRuns = runs.slice(0, 8);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card>
          <CardTitle>Active Agents</CardTitle>
          <CardValue>{activeAgents} <span className="text-base font-normal text-gray-400">/ {agents.length}</span></CardValue>
        </Card>
        <Card>
          <CardTitle>Open Tasks</CardTitle>
          <CardValue>{openTasks}</CardValue>
        </Card>
        <Card>
          <CardTitle>Total Runs</CardTitle>
          <CardValue>{runs.length}</CardValue>
        </Card>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Recent Runs</h3>
        </div>
        {recentRuns.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No runs yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentRuns.map((run: any) => (
              <li key={run.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-500">{run.id.slice(0, 12)}</span>
                  <StatusBadge status={run.status} />
                </div>
                <span className="text-xs text-gray-400 tabular-nums">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
