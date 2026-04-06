import { eq, and, desc, sql } from 'drizzle-orm';
import { runs, costEvents, agents } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';
import type { AdapterRegistry } from '../adapters/registry.js';
import type { AdapterExecutionContext, AdapterExecutionResult } from '@cco/adapter-utils';
import { emitEvent } from '../realtime/live-events.js';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { workProducts } from '@cco/db';
import { logger } from '../middleware/logger.js';

/**
 * Resolve the CCO skills directory path.
 * Looks for skills/ directory relative to the project root (cwd).
 * Returns the project root if skills/ exists (so --add-dir finds .claude/skills or skills/).
 */
function resolveSkillsDir(): string | undefined {
  const cwd = process.cwd();
  const skillsPath = path.join(cwd, 'skills');
  if (fs.existsSync(skillsPath)) {
    return cwd;
  }
  return undefined;
}

function getGitHead(): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(), timeout: 3000,
    }).toString().trim();
  } catch {
    return null;
  }
}

function detectGitWorkProducts(
  db: any,
  teamId: string,
  taskId: string,
  runId: string,
  beforeHead: string,
): void {
  try {
    const afterHead = getGitHead();
    if (!afterHead || afterHead === beforeHead) return;

    const gitLog = execFileSync('git', [
      'log', `${beforeHead}..${afterHead}`, '--format=%h|%s',
    ], { cwd: process.cwd(), timeout: 5000 }).toString().trim();

    if (!gitLog) return;

    for (const line of gitLog.split('\n').filter(Boolean)) {
      const sepIdx = line.indexOf('|');
      if (sepIdx < 0) continue;
      const shortHash = line.slice(0, sepIdx);
      const message = line.slice(sepIdx + 1);

      const now = Date.now();
      db.insert(workProducts).values({
        id: generateId('wp'),
        teamId,
        taskId,
        runId,
        type: 'commit',
        provider: 'local',
        externalId: shortHash,
        title: `${shortHash} — ${message}`,
        status: 'active',
        reviewState: 'none',
        isPrimary: 0,
        healthStatus: 'unknown',
        createdAt: now,
        updatedAt: now,
      }).run();

      logger.info({ taskId, commit: shortHash }, 'Auto-detected commit work product');
    }
  } catch {
    // Git not available — skip silently
  }
}

export interface StartRunOptions {
  readonly teamId: string;
  readonly agentId: string;
  readonly taskId?: string;
  readonly prompt: string;
  readonly invocationSource: string;
  readonly workingDirectory?: string;
}

export interface RunResult {
  readonly runId: string;
  readonly status: string;
  readonly exitCode: number | null;
  readonly error: string | null;
  readonly usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number } | null;
  readonly sessionId: string | null;
  readonly summary: string | null;
}

export interface ExecutionService {
  startRun(opts: StartRunOptions): Promise<RunResult>;
  getRunById(id: string): ReturnType<Database['db']['select']> extends any ? Record<string, unknown> | undefined : never;
  getCostsByRunId(runId: string): Array<Record<string, unknown>>;
  listRuns(teamId: string, agentId?: string): Array<Record<string, unknown>>;
}

export function createExecutionService(database: Database, registry: AdapterRegistry): ExecutionService {
  const { db } = database;

  return {
    async startRun(opts: StartRunOptions): Promise<RunResult> {
      const now = Date.now();
      const runId = generateId('run');

      // Get agent config
      const agent = db
        .select()
        .from(agents)
        .where(and(eq(agents.teamId, opts.teamId), eq(agents.id, opts.agentId)))
        .get();

      if (!agent) {
        return {
          runId,
          status: 'failed',
          exitCode: null,
          error: `Agent ${opts.agentId} not found`,
          usage: null,
          sessionId: null,
          summary: null,
        };
      }

      // Check adapter exists
      const adapter = registry.get(agent.adapterType);
      if (!adapter) {
        // Record failed run
        db.insert(runs).values({
          id: runId,
          teamId: opts.teamId,
          agentId: opts.agentId,
          taskId: opts.taskId ?? null,
          invocationSource: opts.invocationSource,
          status: 'failed',
          error: `Adapter type '${agent.adapterType}' not registered`,
          errorCode: 'ADAPTER_NOT_FOUND',
          startedAt: now,
          finishedAt: now,
          createdAt: now,
          updatedAt: now,
        }).run();

        return {
          runId,
          status: 'failed',
          exitCode: null,
          error: `Adapter type '${agent.adapterType}' not registered`,
          usage: null,
          sessionId: null,
          summary: null,
        };
      }

      // Create run record (status: running)
      db.insert(runs).values({
        id: runId,
        teamId: opts.teamId,
        agentId: opts.agentId,
        taskId: opts.taskId ?? null,
        invocationSource: opts.invocationSource,
        status: 'running',
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      }).run();

      // Update agent status
      db.update(agents)
        .set({ status: 'running', lastHeartbeatAt: now, updatedAt: now })
        .where(eq(agents.id, opts.agentId))
        .run();

      emitEvent('agent.status', opts.teamId, { agentId: opts.agentId, status: 'running' });

      // Build execution context
      let adapterConfig: Record<string, unknown> = {};
      try {
        adapterConfig = JSON.parse(agent.adapterConfig);
      } catch {
        // keep empty
      }

      const logChunks: string[] = [];

      // Resolve skills directory (repo root / skills/)
      const skillsDir = resolveSkillsDir();

      // Inject environment variables for agent to call CCO API
      const ccoEnv: Record<string, string> = {
        CCO_API_URL: `http://localhost:${process.env.CCO_PORT ?? '3100'}`,
        CCO_TEAM_ID: opts.teamId,
        CCO_RUN_ID: runId,
      };
      if (opts.taskId) {
        ccoEnv.CCO_TASK_ID = opts.taskId;
      }

      const ctx: AdapterExecutionContext = {
        runId,
        agent: {
          id: agent.id,
          teamId: agent.teamId,
          name: agent.name,
          role: agent.role,
          adapterType: agent.adapterType,
          adapterConfig,
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
        },
        config: adapterConfig,
        context: { prompt: opts.prompt },
        workingDirectory: opts.workingDirectory,
        env: ccoEnv,
        skillsDir,
        async onLog(_stream, chunk) {
          logChunks.push(chunk);
        },
      };

      // Record git HEAD before execution for work product auto-detection
      const beforeHead = getGitHead();

      // Execute
      let result: AdapterExecutionResult;
      try {
        result = await adapter.execute(ctx);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown execution error';
        const finishedAt = Date.now();

        db.update(runs).set({
          status: 'failed',
          error,
          errorCode: 'EXECUTION_ERROR',
          finishedAt,
          updatedAt: finishedAt,
        }).where(eq(runs.id, runId)).run();

        db.update(agents)
          .set({ status: 'error', updatedAt: finishedAt })
          .where(eq(agents.id, opts.agentId))
          .run();

        emitEvent('agent.status', opts.teamId, { agentId: opts.agentId, status: 'error' });

        return {
          runId,
          status: 'failed',
          exitCode: null,
          error,
          usage: null,
          sessionId: null,
          summary: null,
        };
      }

      const finishedAt = Date.now();
      const runStatus = result.exitCode === 0 ? 'completed' : 'failed';

      // Update run record
      db.update(runs).set({
        status: runStatus,
        exitCode: result.exitCode,
        error: result.errorMessage ?? null,
        finishedAt,
        usageJson: result.usage ? JSON.stringify(result.usage) : null,
        resultJson: result.summary ? JSON.stringify({ summary: result.summary }) : null,
        sessionIdAfter: result.sessionId ?? null,
        stdoutExcerpt: logChunks.join('').slice(0, 100_000),
        updatedAt: finishedAt,
      }).where(eq(runs.id, runId)).run();

      // Update agent status back to idle
      db.update(agents)
        .set({ status: 'idle', updatedAt: finishedAt })
        .where(eq(agents.id, opts.agentId))
        .run();

      emitEvent('agent.status', opts.teamId, { agentId: opts.agentId, status: 'idle' });

      // Auto-detect git work products (commits created during this run)
      if (opts.taskId && runStatus === 'completed' && beforeHead) {
        detectGitWorkProducts(db, opts.teamId, opts.taskId, runId, beforeHead);
      }

      emitEvent('heartbeat.run.status', opts.teamId, {
        runId,
        agentId: opts.agentId,
        taskId: opts.taskId,
        status: runStatus,
      });

      // Create cost event if usage is available
      if (result.usage) {
        const costCents = Math.round((result.costUsd ?? 0) * 100);
        db.insert(costEvents).values({
          id: generateId('cost'),
          teamId: opts.teamId,
          agentId: opts.agentId,
          taskId: opts.taskId ?? null,
          runId,
          provider: result.provider ?? 'unknown',
          model: result.model ?? 'unknown',
          billingType: result.billingType ?? 'api',
          inputTokens: result.usage.inputTokens,
          cachedInputTokens: result.usage.cachedInputTokens ?? 0,
          outputTokens: result.usage.outputTokens,
          costCents,
          occurredAt: finishedAt,
          createdAt: finishedAt,
        }).run();

        // Update agent spent (atomic increment to prevent race conditions)
        db.update(agents).set({
          spentMonthlyCents: sql`spent_monthly_cents + ${costCents}`,
          updatedAt: finishedAt,
        }).where(eq(agents.id, opts.agentId)).run();
      }

      return {
        runId,
        status: runStatus,
        exitCode: result.exitCode,
        error: result.errorMessage ?? null,
        usage: result.usage ?? null,
        sessionId: result.sessionId ?? null,
        summary: result.summary ?? null,
      };
    },

    getRunById(id: string) {
      return db.select().from(runs).where(eq(runs.id, id)).get();
    },

    getCostsByRunId(runId: string) {
      return db.select().from(costEvents).where(eq(costEvents.runId, runId)).all();
    },

    listRuns(teamId: string, agentId?: string) {
      if (agentId) {
        return db
          .select()
          .from(runs)
          .where(and(eq(runs.teamId, teamId), eq(runs.agentId, agentId)))
          .orderBy(desc(runs.createdAt))
          .all();
      }
      return db
        .select()
        .from(runs)
        .where(eq(runs.teamId, teamId))
        .orderBy(desc(runs.createdAt))
        .all();
    },
  };
}
