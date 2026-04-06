import { useState, useMemo } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useRuns, useRun } from '@/api/queries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTeamId } from '@/hooks/useTeamId';
import { Plus, ListTodo, X, Clock, FileText, Search } from 'lucide-react';

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
  const { data: runs = [] } = useRuns(teamId);
  const createTask = useCreateTask(teamId);
  const updateTask = useUpdateTask(teamId);
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);

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

  // Find runs associated with a task
  const taskRuns = selectedTask
    ? runs.filter((r: any) => r.taskId === selectedTask.id)
    : [];

  // Get the latest completed run for detail
  const latestRun = taskRuns.find((r: any) => r.status === 'completed') ?? taskRuns[0] ?? null;

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

      <div className={`grid ${selectedTask ? 'grid-cols-3' : 'grid-cols-6'} gap-3`}>
        {COLUMNS.map((col) => (
          <div
            key={col}
            className={`bg-gray-100/80 rounded-xl p-3 min-h-[60vh] ${selectedTask ? 'hidden last:block [&:nth-child(-n+3)]:block' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {COLUMN_LABELS[col]}
              </h3>
              <span className="text-xs font-mono text-gray-400">{grouped[col]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[col] ?? []).map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                />
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

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          latestRunId={latestRun?.id ?? null}
          taskRuns={taskRuns}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

function TaskCard({ task, isSelected, onClick }: { task: any; isSelected: boolean; onClick: () => void }) {
  const PRIORITY_DOT: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-400',
    medium: 'bg-blue-400',
    low: 'bg-gray-300',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-3 shadow-sm border transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
          : 'border-gray-100 hover:shadow-md hover:border-gray-200'
      }`}
    >
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

function TaskDetail({
  task,
  latestRunId,
  taskRuns,
  onClose,
}: {
  task: any;
  latestRunId: string | null;
  taskRuns: any[];
  onClose: () => void;
}) {
  const { data: run } = useRun(latestRunId);

  const resultJson = run?.resultJson
    ? (typeof run.resultJson === 'string' ? JSON.parse(run.resultJson) : run.resultJson)
    : null;
  const summary = resultJson?.summary ?? null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-8" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <StatusBadge status={task.status} />
              <span className="text-xs font-mono text-gray-400">{task.identifier}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-6 px-6 py-3 border-b border-gray-100 text-sm text-gray-500 shrink-0">
          {task.assigneeAgentId && (
            <span>Agent: <span className="font-mono text-gray-700">{task.assigneeAgentId.slice(0, 16)}</span></span>
          )}
          {task.completedAt && (
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {new Date(task.completedAt).toLocaleString()}
            </span>
          )}
          <span>Runs: <span className="font-mono text-gray-700">{taskRuns.length}</span></span>
        </div>

        {/* Description */}
        {task.description && (
          <div className="px-6 py-4 border-b border-gray-100 shrink-0">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Run output */}
        <div className="flex-1 overflow-auto">
          {!run && taskRuns.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              No runs associated with this task yet.
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText size={13} />
                Agent Output
              </h4>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
                {summary}
              </div>
            </div>
          )}

          {/* Error */}
          {run?.error && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Error</h4>
              <pre className="text-xs text-red-700 bg-red-50 rounded-lg p-3 overflow-x-auto">{run.error}</pre>
            </div>
          )}

          {/* Stdout log */}
          {run?.stdoutExcerpt && (
            <div className="px-6 py-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Raw Log
                <span className="ml-2 text-gray-400 normal-case font-normal">
                  ({(run.stdoutExcerpt.length / 1000).toFixed(1)}KB)
                </span>
              </h4>
              <pre className="text-xs bg-gray-900 text-gray-300 rounded-lg p-4 overflow-x-auto max-h-72 font-mono leading-relaxed">
                {formatStdout(run.stdoutExcerpt)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatStdout(raw: string): string {
  const lines = raw.split('\n');
  const meaningful: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const event = JSON.parse(trimmed);
      const type = event.type;
      const subtype = event.subtype;

      if (type === 'system' && (subtype === 'hook_started' || subtype === 'hook_response')) continue;

      if (type === 'assistant') {
        const content = event.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              meaningful.push(`[assistant] ${block.text}`);
            }
            if (block.type === 'tool_use') {
              const input = typeof block.input === 'object' ? JSON.stringify(block.input).slice(0, 200) : '';
              meaningful.push(`[tool] ${block.name}(${input})`);
            }
          }
        }
      } else if (type === 'tool_result' || type === 'result') {
        const content = event.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              meaningful.push(`[result] ${block.text.slice(0, 500)}`);
            }
          }
        }
      } else if (type === 'system' && subtype === 'init') {
        meaningful.push(`[system] Session: ${event.session_id ?? '?'}, Model: ${event.model ?? '?'}`);
      }
    } catch {
      meaningful.push(trimmed);
    }
  }

  return meaningful.length > 0 ? meaningful.join('\n') : raw.slice(0, 2000);
}
