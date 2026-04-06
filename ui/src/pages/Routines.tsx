import { useRoutines, useTriggerRoutine } from '@/api/queries.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { useTeamId } from '@/hooks/useTeamId.js';
import { CalendarClock, Play, Pause, CirclePlay } from 'lucide-react';

const cardStyle = {
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--color-border)',
};

export function Routines() {
  const teamId = useTeamId();
  const { data: routines = [] } = useRoutines(teamId);
  const triggerRoutine = useTriggerRoutine(teamId);

  function handleTrigger(id: string) {
    triggerRoutine.mutate(id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Routines</h2>
        <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {routines.length} routine{routines.length !== 1 ? 's' : ''}
        </span>
      </div>

      {routines.length === 0 ? (
        <div className="text-center py-20">
          <CalendarClock size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No routines configured yet.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-alt)' }}>
                {['Title', 'Assignee', 'Schedule', 'Status', 'Last Triggered', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routines.map((routine: any, i: number) => {
                const isActive = routine.status === 'active';
                return (
                  <tr
                    key={routine.id}
                    style={i < routines.length - 1 ? { borderBottom: '1px solid var(--color-border)' } : undefined}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: isActive ? 'var(--color-success-light)' : 'var(--color-bg-alt)',
                            color: isActive ? 'var(--color-success)' : 'var(--color-text-muted)',
                          }}
                        >
                          {isActive ? <CirclePlay size={15} /> : <Pause size={15} />}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {routine.title ?? routine.name ?? 'Untitled'}
                          </p>
                          <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                            {routine.id.slice(0, 12)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {routine.assigneeAgentId ? (
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                          {routine.assigneeAgentId.slice(0, 16)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <code
                        className="text-xs px-2 py-1 rounded-md"
                        style={{ background: 'var(--color-bg-alt)', color: 'var(--color-text-secondary)' }}
                      >
                        {routine.cronExpression ?? routine.cron ?? '—'}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={routine.status ?? 'active'} />
                    </td>
                    <td className="px-5 py-4 text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {routine.lastTriggeredAt
                        ? new Date(routine.lastTriggeredAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleTrigger(routine.id)}
                        disabled={triggerRoutine.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                        style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
                      >
                        <Play size={12} /> Trigger
                      </button>
                    </td>
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
