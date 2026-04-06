/**
 * In-memory pub/sub for real-time live events per team.
 * WebSocket clients subscribe to team events; services publish when state changes.
 */

export interface LiveEvent {
  readonly type: string;
  readonly teamId: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
}

type EventListener = (event: LiveEvent) => void;

const teamListeners = new Map<string, Set<EventListener>>();

/** Subscribe to live events for a team. Returns an unsubscribe function. */
export function subscribeTeamEvents(teamId: string, listener: EventListener): () => void {
  let listeners = teamListeners.get(teamId);
  if (!listeners) {
    listeners = new Set();
    teamListeners.set(teamId, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners!.delete(listener);
    if (listeners!.size === 0) {
      teamListeners.delete(teamId);
    }
  };
}

/** Publish a live event to all subscribers for a team. */
export function publishLiveEvent(event: LiveEvent): void {
  const listeners = teamListeners.get(event.teamId);
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Don't let a failing listener break others
    }
  }
}

/** Helper to create and publish a typed event. */
export function emitEvent(
  type: string,
  teamId: string,
  payload: Record<string, unknown>,
): void {
  publishLiveEvent({
    type,
    teamId,
    payload,
    timestamp: Date.now(),
  });
}
