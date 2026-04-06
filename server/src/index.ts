import { createApp } from './app.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const CCO_HOME = process.env.CCO_HOME ?? path.join(os.homedir(), '.cco');
const DB_PATH = process.env.CCO_DB_PATH ?? path.join(CCO_HOME, 'cco.db');
const PORT = parseInt(process.env.CCO_PORT ?? '3100', 10);
const API_KEY = process.env.CCO_API_KEY;

// Ensure home directory exists
fs.mkdirSync(CCO_HOME, { recursive: true });

if (!API_KEY) {
  console.warn('[SECURITY] CCO_API_KEY is not set — all API routes are unauthenticated');
}

const app = createApp({ dbPath: DB_PATH, apiKey: API_KEY });

const SCHEDULER_INTERVAL_MS = parseInt(process.env.CCO_SCHEDULER_INTERVAL_MS ?? '60000', 10);

const server = app.express.listen(PORT, () => {
  console.log(`CCO server running on http://localhost:${PORT}`);
  app.scheduler.start(SCHEDULER_INTERVAL_MS);
  console.log(`Scheduler started (interval: ${SCHEDULER_INTERVAL_MS}ms)`);
});

app.server = server;

process.on('SIGINT', () => {
  server.close();
  app.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.close();
  app.close();
  process.exit(0);
});
