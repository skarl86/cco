import { createApp, logger } from './app.js';
import { claudeCodeAdapter } from '@cco/adapter-claude-code';
import { geminiAdapter } from '@cco/adapter-gemini';
import { codexAdapter } from '@cco/adapter-codex';
import { openCodeAdapter } from '@cco/adapter-opencode';
import { attachWebSocketServer } from './realtime/index.js';
import { loadConfig, getCcoHome } from './config.js';
import fs from 'node:fs';

// Load layered config (env > file > defaults)
const config = loadConfig();

const CCO_HOME = getCcoHome();
const DB_PATH = config.database?.path ?? `${CCO_HOME}/cco.db`;
const PORT = config.server?.port ?? 3100;
const API_KEY = config.auth?.apiKey;

// Ensure home directory exists
fs.mkdirSync(CCO_HOME, { recursive: true });

if (!API_KEY) {
  logger.warn('CCO_API_KEY is not set — all API routes are unauthenticated');
}

const app = createApp({ dbPath: DB_PATH, apiKey: API_KEY, adapters: [claudeCodeAdapter, geminiAdapter, codexAdapter, openCodeAdapter] });

const SCHEDULER_INTERVAL_MS = config.scheduler?.intervalMs ?? 60_000;

const server = app.express.listen(PORT, () => {
  logger.info({ port: PORT }, 'CCO server running');

  // Attach WebSocket server for real-time events
  attachWebSocketServer(server);
  logger.info('WebSocket server attached');

  // Start heartbeat scheduler
  if (config.scheduler?.enabled !== false) {
    app.scheduler.start(SCHEDULER_INTERVAL_MS);
    logger.info({ intervalMs: SCHEDULER_INTERVAL_MS }, 'Scheduler started');
  }
});

app.server = server;

function shutdown() {
  logger.info('Shutting down...');
  server.close(() => {
    app.close();
    logger.info('Server closed');
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
