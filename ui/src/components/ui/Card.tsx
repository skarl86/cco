interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{children}</h3>;
}

export function CardValue({ children }: { children: React.ReactNode }) {
  return <p className="text-3xl font-bold text-gray-900 tabular-nums">{children}</p>;
}
