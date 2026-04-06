import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createDatabase, type Database } from '@cco/db';
import type { Server } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import type { ServerAdapterModule, AdapterExecutionContext, AdapterExecutionResult } from '@cco/adapter-utils';
import { teamsRouter } from './routes/teams.js';
import { agentsRouter } from './routes/agents.js';
import { runsRouter } from './routes/runs.js';
import { tasksRouter } from './routes/tasks.js';
import { commentsRouter } from './routes/comments.js';
import { approvalsRouter } from './routes/approvals.js';
import { routinesRouter } from './routes/routines.js';
import { projectsRouter } from './routes/projects.js';
import { AdapterRegistry } from './adapters/registry.js';
import { createExecutionService, type ExecutionService } from './services/execution.js';

export interface AppConfig {
  readonly dbPath: string;
  readonly adapters?: ServerAdapterModule[];
  readonly apiKey?: string;
}

export interface App {
  readonly express: Express;
  readonly database: Database;
  readonly registry: AdapterRegistry;
  readonly executionService: ExecutionService;
  server?: Server;
  close(): void;
}

const mockAdapter: ServerAdapterModule = {
  type: 'mock',
  async execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    await ctx.onLog('stdout', 'mock output');
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage: { inputTokens: 100, outputTokens: 50, cachedInputTokens: 10 },
      sessionId: 'mock-session',
      provider: 'mock',
      model: 'mock-model',
      billingType: 'api',
      costUsd: 0.001,
      summary: 'Mock completed',
    };
  },
  async testEnvironment() {
    return { ok: true };
  },
};

export function createApp(config: AppConfig): App {
  const database = createDatabase(config.dbPath);
  const registry = new AdapterRegistry();

  // Register built-in mock adapter (useful for testing)
  registry.register(mockAdapter);

  // Register custom adapters
  if (config.adapters) {
    for (const adapter of config.adapters) {
      registry.register(adapter);
    }
  }

  const executionService = createExecutionService(database, registry);
  const app = express();

  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '0.1.0',
      database: 'connected',
      timestamp: Date.now(),
    });
  });

  // API key auth (optional)
  if (config.apiKey) {
    const key = config.apiKey;
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health') { next(); return; }
      const auth = req.headers.authorization ?? '';
      const expected = `Bearer ${key}`;
      const isValid = auth.length === expected.length &&
        timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
      if (!isValid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
    });
  }

  // Resource routes
  app.use('/api/teams', teamsRouter(database));
  app.use('/api/teams/:teamId/agents', agentsRouter(database));
  app.use('/api/teams/:teamId/tasks', tasksRouter(database));
  app.use('/api/teams/:teamId/tasks/:taskId/comments', commentsRouter(database));
  app.use('/api/teams/:teamId/approvals', approvalsRouter(database));
  app.use('/api/teams/:teamId/routines', routinesRouter(database));
  app.use('/api/teams/:teamId/projects', projectsRouter(database));
  app.use('/api', runsRouter(executionService));

  // 404 handler for /api routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Serve static UI in production
  const uiDist = path.resolve(import.meta.dirname ?? __dirname, '../../ui/dist');
  if (fs.existsSync(uiDist)) {
    app.use(express.static(uiDist));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(uiDist, 'index.html'));
    });
  }

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return {
    express: app,
    database,
    registry,
    executionService,
    close() {
      database.close();
    },
  };
}
