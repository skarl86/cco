import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './ToastProvider.js';

interface LiveUpdatesContextValue {
  readonly connected: boolean;
}

const LiveUpdatesContext = createContext<LiveUpdatesContextValue>({ connected: false });

export function useLiveUpdates() {
  return useContext(LiveUpdatesContext);
}

interface Props {
  readonly teamId: string | null;
  readonly children: ReactNode;
}

export function LiveUpdatesProvider({ teamId, children }: Props) {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!teamId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/teams/${teamId}/events/ws`;

    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      if (closed) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        connectedRef.current = true;
        retryDelay = 1000;
      });

      ws.addEventListener('message', (ev) => {
        try {
          const event = JSON.parse(ev.data) as { type: string; payload: Record<string, unknown> };
          handleEvent(event, qc, addToast);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.addEventListener('close', () => {
        connectedRef.current = false;
        wsRef.current = null;
        if (!closed) {
          retryTimer = setTimeout(connect, Math.min(retryDelay, 15_000));
          retryDelay *= 1.5;
        }
      });

      ws.addEventListener('error', () => {
        ws.close();
      });
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [teamId, qc, addToast]);

  return (
    <LiveUpdatesContext value={{ connected: connectedRef.current }}>
      {children}
    </LiveUpdatesContext>
  );
}

function handleEvent(
  event: { type: string; payload: Record<string, unknown> },
  qc: ReturnType<typeof useQueryClient>,
  addToast: (msg: string, tone?: 'info' | 'success' | 'warning' | 'error') => void,
) {
  switch (event.type) {
    case 'agent.status':
      qc.invalidateQueries({ queryKey: ['agents'] });
      break;
    case 'heartbeat.run.queued':
      qc.invalidateQueries({ queryKey: ['runs'] });
      addToast('Agent run started', 'info');
      break;
    case 'heartbeat.run.status': {
      qc.invalidateQueries({ queryKey: ['runs'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
      const status = event.payload.status as string;
      if (status === 'completed') addToast('Run completed', 'success');
      else if (status === 'failed') addToast('Run failed', 'error');
      break;
    }
    case 'routine.triggered':
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['routines'] });
      addToast(`Routine triggered: ${event.payload.title}`, 'info');
      break;
    default:
      // Generic invalidation for unknown events
      qc.invalidateQueries({ queryKey: ['dashboard'] });
  }
}
