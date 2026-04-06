interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </h3>
  );
}

export function CardValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
      {children}
    </p>
  );
}
