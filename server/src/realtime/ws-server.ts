/**
 * WebSocket server for real-time live events.
 * Clients connect to /api/teams/:teamId/events/ws and receive JSON-encoded LiveEvents.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'node:http';
import { subscribeTeamEvents, type LiveEvent } from './live-events.js';
import { logger } from '../middleware/logger.js';

const PING_INTERVAL_MS = 30_000;

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    const match = url.pathname.match(/^\/api\/teams\/([^/]+)\/events\/ws$/);

    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, match[1]);
    });
  });

  // Handle new connections
  wss.on('connection', (ws: WebSocket, _request: unknown, teamId: string) => {
    logger.info({ teamId }, 'WebSocket client connected');

    // Subscribe to team events
    const unsubscribe = subscribeTeamEvents(teamId, (event: LiveEvent) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, PING_INTERVAL_MS);

    // Cleanup on close
    ws.on('close', () => {
      logger.info({ teamId }, 'WebSocket client disconnected');
      unsubscribe();
      clearInterval(pingInterval);
    });

    ws.on('error', (err) => {
      logger.error({ teamId, err }, 'WebSocket error');
      unsubscribe();
      clearInterval(pingInterval);
    });
  });

  return wss;
}
