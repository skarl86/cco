import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastTone = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
  readonly dismissAt: number;
}

interface ToastContextValue {
  readonly toasts: readonly Toast[];
  readonly addToast: (message: string, tone?: ToastTone, ttlMs?: number) => void;
  readonly removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, tone: ToastTone = 'info', ttlMs = 5000) => {
    const id = `toast-${++toastCounter}`;
    const toast: Toast = { id, message, tone, dismissAt: Date.now() + ttlMs };
    setToasts((prev) => [...prev.slice(-4), toast]); // Keep max 5
    setTimeout(() => removeToast(id), ttlMs);
  }, [removeToast]);

  return (
    <ToastContext value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext>
  );
}

const TONE_STYLES: Record<ToastTone, string> = {
  info: 'border-l-[var(--color-accent)]',
  success: 'border-l-[var(--color-success)]',
  warning: 'border-l-[var(--color-warning)]',
  error: 'border-l-[var(--color-error)]',
};

function ToastViewport({ toasts, onDismiss }: { toasts: readonly Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-enter rounded-lg border-l-4 px-4 py-3 text-sm shadow-md ${TONE_STYLES[t.tone]}`}
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-text-muted)' }}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
