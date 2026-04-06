import { useState, useMemo } from 'react';
import { useGoals, useCreateGoal } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';
import { Target, Plus, ChevronRight, ChevronDown } from 'lucide-react';

interface GoalNode {
  goal: any;
  children: GoalNode[];
}

function buildTree(goals: any[]): GoalNode[] {
  const map = new Map<string, GoalNode>();
  const roots: GoalNode[] = [];

  for (const goal of goals) {
    map.set(goal.id, { goal, children: [] });
  }

  for (const goal of goals) {
    const node = map.get(goal.id)!;
    if (goal.parentId && map.has(goal.parentId)) {
      map.get(goal.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'var(--color-error)',
  high: 'var(--color-warning)',
  medium: 'var(--color-accent)',
  low: 'var(--color-text-muted)',
};

function GoalRow({ node, depth }: { node: GoalNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <li
        className="flex items-center gap-3 px-5 py-3 transition-colors"
        style={{
          paddingLeft: `${1.25 + depth * 1.5}rem`,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors"
          style={{
            color: hasChildren ? 'var(--color-text-secondary)' : 'transparent',
            cursor: hasChildren ? 'pointer' : 'default',
          }}
          disabled={!hasChildren}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: PRIORITY_DOTS[node.goal.priority] ?? 'var(--color-text-muted)',
          }}
        />

        <span
          className="flex-1 text-sm font-medium truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {node.goal.title}
        </span>

        <StatusBadge status={node.goal.status ?? 'active'} />

        {node.goal.priority && (
          <span
            className="text-xs capitalize"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {node.goal.priority}
          </span>
        )}
      </li>

      {expanded &&
        node.children.map((child) => (
          <GoalRow key={child.goal.id} node={child} depth={depth + 1} />
        ))}
    </>
  );
}

export function Goals() {
  const teamId = useTeamId();
  const { data: goals = [], isLoading } = useGoals(teamId);
  const createGoal = useCreateGoal(teamId);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  const tree = useMemo(() => buildTree(goals), [goals]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createGoal.mutate(
      {
        title,
        description: description || undefined,
        parentId: parentId || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setParentId('');
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Goals
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'var(--color-accent)',
            color: 'white',
          }}
        >
          <Plus size={16} /> New Goal
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-xl border p-5 mb-6"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal title"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this goal..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
                style={{
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Parent Goal (optional)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <option value="">None (top-level)</option>
                {goals.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createGoal.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                {createGoal.isPending ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-4 animate-pulse"
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded" style={{ background: 'var(--color-bg-alt)' }} />
                <div className="flex-1 h-3.5 rounded" style={{ background: 'var(--color-bg-alt)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Target size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No goals yet. Create one to get started.</p>
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
          <div
            className="px-5 py-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider"
            style={{
              color: 'var(--color-text-muted)',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-alt)',
            }}
          >
            <span className="w-5" />
            <span className="w-2" />
            <span className="flex-1">Title</span>
            <span>Status</span>
            <span className="w-16 text-right">Priority</span>
          </div>
          <ul>
            {tree.map((node) => (
              <GoalRow key={node.goal.id} node={node} depth={0} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
