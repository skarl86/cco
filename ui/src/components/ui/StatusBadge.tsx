type StatusStyle = { bg: string; text: string; pulse?: boolean };

const STATUS_STYLES: Record<string, StatusStyle> = {
  idle:        { bg: 'var(--color-bg-alt)', text: 'var(--color-text-muted)' },
  running:     { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)', pulse: true },
  paused:      { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  error:       { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
  completed:   { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  failed:      { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
  queued:      { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)' },
  cancelled:   { bg: 'var(--color-bg-alt)', text: 'var(--color-text-muted)' },
  backlog:     { bg: 'var(--color-bg-alt)', text: 'var(--color-text-muted)' },
  todo:        { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)' },
  in_progress: { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)', pulse: true },
  in_review:   { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  blocked:     { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
  done:        { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  active:      { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  pending:     { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  provisioning: { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)', pulse: true },
  ready:       { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  archived:    { bg: 'var(--color-bg-alt)', text: 'var(--color-text-muted)' },
  approved:    { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  rejected:    { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
};

const DEFAULT_STYLE: StatusStyle = { bg: 'var(--color-bg-alt)', text: 'var(--color-text-muted)' };

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const s = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${s.pulse ? 'animate-pulse' : ''} ${className}`}
      style={{ background: s.bg, color: s.text }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
