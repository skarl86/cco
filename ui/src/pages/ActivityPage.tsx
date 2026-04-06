import { useState } from 'react';
import { useActivity } from '@/api/queries';
import { useTeamId } from '@/hooks/useTeamId';
import { Activity, User, Bot, Server, Plus, Pencil, Trash2, Play, Filter } from 'lucide-react';

const ACTION_STYLES: Record<string, { color: string; bg: string }> = {
  created: { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  updated: { color: 'var(--color-accent)', bg: 'var(--color-accent-light)' },
  deleted: { color: 'var(--color-error)', bg: 'var(--color-error-light)' },
  triggered: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  completed: { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  failed: { color: 'var(--color-error)', bg: 'var(--color-error-light)' },
};

const ACTION_ICONS: Record<string, typeof Plus> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  triggered: Play,
};

const ACTOR_ICONS: Record<string, typeof User> = {
  user: User,
  agent: Bot,
  system: Server,
};

const ENTITY_TYPES = ['all', 'agent', 'task', 'run', 'goal', 'routine', 'approval', 'project'] as const;

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

export function ActivityPage() {
  const teamId = useTeamId();
  const { data: activities = [], isLoading } = useActivity(teamId);
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const filtered = entityFilter === 'all'
    ? activities
    : activities.filter((a: any) => a.entityType === entityFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Activity
        </h2>

        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border-none outline-none"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-4 animate-pulse"
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg"
                  style={{ background: 'var(--color-bg-alt)' }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className="h-3.5 rounded w-2/3"
                    style={{ background: 'var(--color-bg-alt)' }}
                  />
                  <div
                    className="h-3 rounded w-1/4"
                    style={{ background: 'var(--color-bg-alt)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Activity size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {entityFilter === 'all' ? 'No activity yet.' : `No ${entityFilter} activity found.`}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filtered.map((entry: any) => {
              const actionStyle = ACTION_STYLES[entry.action] ?? {
                color: 'var(--color-text-muted)',
                bg: 'var(--color-bg-alt)',
              };
              const ActionIcon = ACTION_ICONS[entry.action] ?? Activity;
              const ActorIcon = ACTOR_ICONS[entry.actorType] ?? User;

              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: actionStyle.bg }}
                  >
                    <ActionIcon size={16} style={{ color: actionStyle.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                      <span className="font-medium capitalize">{entry.actorType ?? 'system'}</span>
                      {' '}
                      <span
                        className="font-semibold"
                        style={{ color: actionStyle.color }}
                      >
                        {entry.action}
                      </span>
                      {' '}
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {entry.entityType}
                      </span>
                      {' '}
                      <span
                        className="font-mono text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {entry.entityId?.slice(0, 12)}
                      </span>
                    </p>
                    {entry.description && (
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {entry.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className="flex items-center gap-1.5"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <ActorIcon size={13} />
                      <span className="text-xs capitalize">{entry.actorType ?? 'system'}</span>
                    </div>
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
