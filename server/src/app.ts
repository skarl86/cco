import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createDatabase, type Database } from '@cco/db';
import type { Server } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { ServerAdapterModule, AdapterExecutionContext, AdapterExecutionResult } from '@cco/adapter-utils';
import { teamsRouter } from './routes/teams.js';
import { agentsRouter } from './routes/agents.js';
import { runsRouter } from './routes/runs.js';
import { tasksRouter } from './routes/tasks.js';
import { commentsRouter } from './routes/comments.js';
import { approvalsRouter } from './routes/approvals.js';
import { routinesRouter } from './routes/routines.js';
import { projectsRouter } from './routes/projects.js';
import { goalsRouter } from './routes/goals.js';
import { activityRouter } from './routes/activity.js';
import { agentKeysRouter } from './routes/agent-keys.js';
import { agentDetailsRouter } from './routes/agent-details.js';
import { documentsRouter } from './routes/documents.js';
import { feedbackRouter, taskFeedbackRouter } from './routes/feedback.js';
import { dashboardRouter, sidebarBadgesRouter } from './routes/dashboard.js';
import { costsRouter } from './routes/costs.js';
import { assetsRouter } from './routes/assets.js';
import { secretsRouter } from './routes/secrets.js';
import { adaptersRouter } from './routes/adapters.js';
import { exportImportRouter } from './routes/export-import.js';
import { labelsRouter, taskLabelsRouter } from './routes/labels.js';
import { workspacesRouter } from './routes/workspaces.js';
import { createLocalDiskStorage, type StorageProvider } from './storage/index.js';
import { createLocalEncryptedSecrets, type SecretsProvider } from './secrets/index.js';
import { AdapterRegistry } from './adapters/registry.js';
import { createExecutionService, type ExecutionService } from './services/execution.js';
import { createScheduler, type Scheduler } from './services/scheduler.js';
import { createCheckoutService } from './services/checkout.js';
import { createTasksService } from './services/tasks.js';
import { httpLogger, logger } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { unauthorized } from './errors.js';

export { logger } from './middleware/logger.js';

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
  readonly scheduler: Scheduler;
  readonly storage: StorageProvider;
  readonly secrets: SecretsProvider;
  readonly logger: typeof logger;
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

  const storage = createLocalDiskStorage(path.join(os.homedir(), '.cco', 'storage'));
  const secrets = createLocalEncryptedSecrets();
  const executionService = createExecutionService(database, registry);
  const checkoutService = createCheckoutService(database);
  const tasksService = createTasksService(database);
  const scheduler = createScheduler({
    database,
    executionService,
    checkoutService,
    tasksService,
  });
  const app = express();

  // --- Middleware Pipeline ---

  // 1. HTTP request logging (pino)
  app.use(httpLogger);

  // 2. JSON body parsing
  app.use(express.json({ limit: '15mb' }));

  // 3. Health endpoint (always public, before auth)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '0.1.0',
      database: 'connected',
      timestamp: Date.now(),
    });
  });

  // 4. API key authentication (optional)
  if (config.apiKey) {
    const key = config.apiKey;
    app.use('/api', (req: Request, _res: Response, next: NextFunction) => {
      if (req.path === '/health') { next(); return; }
      const auth = req.headers.authorization ?? '';
      const expected = `Bearer ${key}`;
      // Hash both sides to constant length, preventing timing oracle on length mismatch
      const ha = createHash('sha256').update(auth).digest();
      const hb = createHash('sha256').update(expected).digest();
      const isValid = timingSafeEqual(ha, hb);
      if (!isValid) throw unauthorized();
      next();
    });
  }

  // --- Resource Routes ---
  app.use('/api/teams', teamsRouter(database));
  app.use('/api/teams/:teamId/agents', agentsRouter(database));
  app.use('/api/teams/:teamId/tasks', tasksRouter(database));
  app.use('/api/teams/:teamId/tasks/:taskId/comments', commentsRouter(database));
  app.use('/api/teams/:teamId/approvals', approvalsRouter(database));
  app.use('/api/teams/:teamId/routines', routinesRouter(database));
  app.use('/api/teams/:teamId/projects', projectsRouter(database));
  app.use('/api/teams/:teamId/goals', goalsRouter(database));
  app.use('/api/teams/:teamId/activity', activityRouter(database));
  app.use('/api/teams/:teamId/tasks/:taskId/documents', documentsRouter(database));
  app.use('/api/teams/:teamId/labels', labelsRouter(database));
  app.use('/api/teams/:teamId/tasks/:taskId/labels', taskLabelsRouter(database));
  app.use('/api/teams/:teamId/tasks/:taskId/feedback', taskFeedbackRouter(database));
  app.use('/api/teams/:teamId/feedback', feedbackRouter(database));
  app.use('/api/teams/:teamId/agents/:agentId/keys', agentKeysRouter(database));
  app.use('/api/teams/:teamId/dashboard', dashboardRouter(database));
  app.use('/api/teams/:teamId/costs', costsRouter(database));
  app.use('/api/teams/:teamId/assets', assetsRouter(database, storage));
  app.use('/api/teams/:teamId/workspaces', workspacesRouter(database));
  app.use('/api/teams/:teamId/secrets', secretsRouter(secrets));
  app.use('/api/teams/:teamId', exportImportRouter(database));
  app.use('/api/sidebar-badges', sidebarBadgesRouter(database));
  app.use('/api/adapters', adaptersRouter(registry));
  app.use('/api/agents/:agentId', agentDetailsRouter(database));
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

  // --- Centralized Error Handler (must be last) ---
  app.use(errorHandler);

  return {
    express: app,
    database,
    registry,
    executionService,
    scheduler,
    storage,
    secrets,
    logger,
    close() {
      scheduler.stop();
      database.close();
    },
  };
}
