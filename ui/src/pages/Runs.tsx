import { useRuns } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';
import { Play } from 'lucide-react';

export function Runs() {
  const teamId = useTeamId();
  const { data: runs = [] } = useRuns(teamId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Runs</h2>

      {runs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Play size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No runs yet. Execute an agent to see results here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Run ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((run: any) => {
                const duration = run.finishedAt && run.startedAt
                  ? `${((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s`
                  : '—';
                return (
                  <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{run.id.slice(0, 16)}</td>
                    <td className="px-5 py-3 text-gray-700">{run.agentId.slice(0, 16)}</td>
                    <td className="px-5 py-3"><StatusBadge status={run.status} /></td>
                    <td className="px-5 py-3 text-gray-500 capitalize">{run.invocationSource.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-500">{duration}</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
