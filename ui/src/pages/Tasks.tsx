import { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';
import { Plus, ListTodo } from 'lucide-react';

const COLUMNS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'Review',
  done: 'Done',
};

export function Tasks() {
  const teamId = useTeamId();
  const { data: tasks = [] } = useTasks(teamId);
  const createTask = useCreateTask(teamId);
  const updateTask = useUpdateTask(teamId);
  const [title, setTitle] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate({ title }, { onSuccess: () => setTitle('') });
  }

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = tasks.filter((t: any) => t.status === col);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
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

      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => (
          <div key={col} className="bg-gray-100/80 rounded-xl p-3 min-h-[60vh]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {COLUMN_LABELS[col]}
              </h3>
              <span className="text-xs font-mono text-gray-400">{grouped[col]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[col] ?? []).map((task: any) => (
                <TaskCard key={task.id} task={task} teamId={teamId} onMove={updateTask.mutate} />
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

function TaskCard({ task, teamId, onMove }: { task: any; teamId: string; onMove: Function }) {
  const PRIORITY_DOT: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-400',
    medium: 'bg-blue-400',
    low: 'bg-gray-300',
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 mb-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />
        <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-gray-400">{task.identifier}</span>
        {task.assigneeAgentId && (
          <span className="text-[10px] text-blue-500 font-medium">
            {task.assigneeAgentId.slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}
