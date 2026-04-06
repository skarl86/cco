import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useTask, useComments, useCreateComment, useUpdateTask } from '@/api/queries.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { useTeamId } from '@/hooks/useTeamId.js';
import {
  ArrowLeft, ListTodo, Clock, MessageSquare, Send,
  ArrowRight, User, Bot,
} from 'lucide-react';

const cardStyle = {
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--color-border)',
};

const TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  backlog: [{ label: 'Move to To Do', next: 'todo' }],
  todo: [{ label: 'Start Work', next: 'in_progress' }],
  in_progress: [
    { label: 'Send to Review', next: 'in_review' },
    { label: 'Block', next: 'blocked' },
  ],
  blocked: [{ label: 'Resume Work', next: 'in_progress' }],
  in_review: [
    { label: 'Approve', next: 'done' },
    { label: 'Back to In Progress', next: 'in_progress' },
  ],
  done: [],
  cancelled: [],
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
  high: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  medium: { bg: 'var(--color-accent-light)', text: 'var(--color-accent)' },
  low: { bg: 'var(--color-bg-alt)', text: 'var(--color-text-muted)' },
};

export default function TaskDetail() {
  const { taskId } = useParams();
  const teamId = useTeamId();
  const { data: task, isLoading } = useTask(teamId, taskId ?? '');
  const { data: comments = [] } = useComments(teamId, taskId ?? '');
  const createComment = useCreateComment(teamId, taskId ?? '');
  const updateTask = useUpdateTask(teamId);
  const [commentBody, setCommentBody] = useState('');

  function handleStatusChange(next: string) {
    if (!task) return;
    updateTask.mutate({ id: task.id, status: next });
  }

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    createComment.mutate(
      { body: commentBody, authorType: 'human' },
      { onSuccess: () => setCommentBody('') },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
        <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--color-border)' }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-20">
        <ListTodo size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Task not found.</p>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 mt-4 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          <ArrowLeft size={14} /> Back to tasks
        </Link>
      </div>
    );
  }

  const transitions = TRANSITIONS[task.status] ?? [];
  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low;

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/tasks"
        className="inline-flex items-center gap-1 text-sm font-medium mb-6"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={14} /> All tasks
      </Link>

      {/* Header */}
      <div className="rounded-xl p-5 mb-6" style={cardStyle}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={task.status} />
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: priorityColor.bg, color: priorityColor.text }}
              >
                {task.priority ?? 'medium'}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {task.identifier}
              </span>
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {task.title}
            </h2>
          </div>
        </div>

        {task.description && (
          <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-text-secondary)' }}>
            {task.description}
          </p>
        )}

        {/* Status transition buttons */}
        {transitions.length > 0 && (
          <div className="flex items-center gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            {transitions.map(({ label, next }) => (
              <button
                key={next}
                onClick={() => handleStatusChange(next)}
                disabled={updateTask.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                style={
                  next === 'done'
                    ? { background: 'var(--color-success)', color: '#fff' }
                    : { background: 'var(--color-accent)', color: '#fff' }
                }
              >
                <ArrowRight size={14} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comments */}
        <div className="lg:col-span-2">
          <section className="rounded-xl overflow-hidden" style={cardStyle}>
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <MessageSquare size={14} style={{ color: 'var(--color-text-muted)' }} />
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Comments
              </h3>
              <span className="text-xs font-mono ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                {comments.length}
              </span>
            </div>

            {/* Thread */}
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {comments.length === 0 && (
                <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                  No comments yet. Start the conversation below.
                </p>
              )}
              {comments.map((comment: any) => {
                const isAgent = comment.authorType === 'agent';
                return (
                  <div key={comment.id} className="px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          background: isAgent ? 'var(--color-accent-light)' : 'var(--color-bg-alt)',
                          color: isAgent ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                        }}
                      >
                        {isAgent ? <Bot size={12} /> : <User size={12} />}
                      </div>
                      <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                        {comment.authorType ?? 'human'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {comment.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Add comment form */}
            <form
              onSubmit={handleCommentSubmit}
              className="px-5 py-4 flex gap-3"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <button
                type="submit"
                disabled={createComment.isPending || !commentBody.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--color-accent)' }}
              >
                <Send size={14} /> Send
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignee */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Assignee
            </h3>
            {task.assigneeAgentId ? (
              <Link
                to={`/agents/${task.assigneeAgentId}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                style={{ background: 'var(--color-bg-alt)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-text)' }}
                >
                  <Bot size={14} />
                </div>
                <span className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {task.assigneeAgentId.slice(0, 16)}
                </span>
              </Link>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Unassigned</p>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              <Clock size={14} /> Timeline
            </h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Created', task.createdAt],
                ['Started', task.startedAt],
                ['Completed', task.completedAt],
              ].map(([label, date]) => (
                <div key={label as string} className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>{label as string}</dt>
                  <dd className="font-mono tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {date ? new Date(date as string).toLocaleDateString() : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Details */}
          <section className="rounded-xl p-5" style={cardStyle}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Details
            </h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Project', task.projectId?.slice(0, 16) ?? '—'],
                ['Priority', task.priority ?? 'medium'],
                ['Identifier', task.identifier ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
                  <dd className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
