import { eq, and, desc, sql } from 'drizzle-orm';
import { runs, costEvents, agents } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';
import type { AdapterRegistry } from '../adapters/registry.js';
import type { AdapterExecutionContext, AdapterExecutionResult } from '@cco/adapter-utils';

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

      // Build execution context
      let adapterConfig: Record<string, unknown> = {};
      try {
        adapterConfig = JSON.parse(agent.adapterConfig);
      } catch {
        // keep empty
      }

      const logChunks: string[] = [];

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
        async onLog(_stream, chunk) {
          logChunks.push(chunk);
        },
      };

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
        sessionIdAfter: result.sessionId ?? null,
        stdoutExcerpt: logChunks.join('').slice(0, 10_000),
        updatedAt: finishedAt,
      }).where(eq(runs.id, runId)).run();

      // Update agent status back to idle
      db.update(agents)
        .set({ status: 'idle', updatedAt: finishedAt })
        .where(eq(agents.id, opts.agentId))
        .run();

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
