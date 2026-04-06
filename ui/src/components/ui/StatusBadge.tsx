const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700 animate-pulse',
  paused: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  queued: 'bg-violet-100 text-violet-700',
  cancelled: 'bg-gray-100 text-gray-500',
  backlog: 'bg-gray-100 text-gray-600',
  todo: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${color} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
