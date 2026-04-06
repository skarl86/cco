import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useTasks, useCreateTask } from '@/api/queries';
import { useTeamId } from '@/hooks/useTeamId';
import { Plus, ListTodo, Search } from 'lucide-react';

const COLUMNS = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'] as const;

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
};

export function Tasks() {
  const teamId = useTeamId();
  const { data: tasks = [] } = useTasks(teamId);
  const createTask = useCreateTask(teamId);
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t: any) =>
        t.title?.toLowerCase().includes(q) ||
        t.identifier?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [tasks, searchQuery]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate({ title }, { onSuccess: () => setTitle('') });
  }

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = filteredTasks.filter((t: any) => t.status === col);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title..."
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <button
            type="submit"
            disabled={createTask.isPending}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} /> Add
          </button>
        </form>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="rounded-xl p-3 min-h-[60vh]"
            style={{ background: 'var(--color-bg-alt)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {COLUMN_LABELS[col]}
              </h3>
              <span className="text-xs font-mono text-gray-400">{grouped[col]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[col] ?? []).map((task: any) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ListTodo size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tasks yet. Add one above.</p>
        </div>
      )}

    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'var(--color-error)',
    critical: 'var(--color-error)',
    high: 'var(--color-warning)',
    medium: 'var(--color-accent)',
    low: 'var(--color-text-muted)',
  };

  return (
    <Link
      to={`/tasks/${task.id}`}
      className="block rounded-lg p-3 transition-all"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ background: PRIORITY_COLORS[task.priority] ?? 'var(--color-text-muted)' }}
        />
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)' }}>{task.title}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{task.identifier}</span>
        {task.assigneeAgentId && (
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-accent)' }}>
            {task.assigneeAgentId.slice(0, 10)}
          </span>
        )}
      </div>
    </Link>
  );
}

