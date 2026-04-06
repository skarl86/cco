import { eq, and, sql, lt } from 'drizzle-orm';
import { agents, runs, routines } from '@cco/db';
import type { Database } from '@cco/db';
import type { ExecutionService, RunResult } from './execution.js';
import { parseCron, cronMatches } from './cron.js';
import { emitEvent } from '../realtime/live-events.js';
import { logger } from '../middleware/logger.js';

/**
 * Build a prompt that instructs the agent to register work products after completing work.
 */
function buildTaskPrompt(task: { title: string; description: string | null; identifier: string | null; teamId: string; id: string }, teamId: string): string {
  return `## Task
Title: ${task.title}
${task.description ? `Description: ${task.description}` : ''}
Identifier: ${task.identifier}

## Instructions
1. Complete the task described above.
2. After completing the work, register any outputs you created using the CCO Work Products API:

   For each commit, branch, or PR you create, call:

   POST http://localhost:3100/api/teams/${teamId}/tasks/${task.id}/work-products
   Content-Type: application/json

   For a commit:
   {"type": "commit", "provider": "local", "title": "<commit hash> — <message>", "externalId": "<hash>"}

   For a branch:
   {"type": "branch", "provider": "local", "title": "<branch-name>"}

   For a pull request:
   {"type": "pull_request", "provider": "github", "title": "<PR title>", "url": "<PR URL>", "externalId": "<PR number>", "isPrimary": true, "status": "ready_for_review", "reviewState": "needs_review"}

3. You can use curl or fetch to call the API.
`;
}

interface SchedulerDeps {
  readonly database: Database;
  readonly executionService: ExecutionService;
  readonly checkoutService: {
    pickNextTask(teamId: string, agentId: string): any;
    checkout(teamId: string, taskId: string, agentId: string, runId: string): any;
    release(teamId: string, taskId: string, newStatus?: string, actorAgentId?: string, actorRunId?: string): void;
  };
  readonly tasksService: {
    list(teamId: string, filters?: any): any[];
    create(teamId: string, data: any): any;
  };
}

export interface Scheduler {
  tick(): Promise<RunResult[]>;
  tickScheduledTriggers(): void;
  reapOrphanedRuns(): void;
  start(intervalMs?: number): void;
  stop(): void;
}

const ORPHAN_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function createScheduler(deps: SchedulerDeps): Scheduler {
  const { database, executionService, checkoutService, tasksService } = deps;
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    async tick(): Promise<RunResult[]> {
      // Run all sub-ticks
      this.reapOrphanedRuns();
      this.tickScheduledTriggers();

      const results: RunResult[] = [];

      // Find all idle agents across all teams
      const idleAgents = database.db
        .select()
        .from(agents)
        .where(eq(agents.status, 'idle'))
        .all();

      for (const agent of idleAgents) {
        const task = checkoutService.pickNextTask(agent.teamId, agent.id);
        if (!task) continue;

        const co = checkoutService.checkout(agent.teamId, task.id, agent.id, `pending-${agent.id}`);
        if (!co.success) continue;

        const prompt = buildTaskPrompt(task, agent.teamId);

        emitEvent('heartbeat.run.queued', agent.teamId, {
          agentId: agent.id,
          taskId: task.id,
        });

        const result = await executionService.startRun({
          teamId: agent.teamId,
          agentId: agent.id,
          taskId: task.id,
          prompt,
          invocationSource: 'heartbeat',
        });

        if (result.status === 'failed') {
          checkoutService.release(agent.teamId, task.id, 'todo', agent.id);
        } else {
          checkoutService.release(agent.teamId, task.id, 'done', agent.id);
        }

        emitEvent('heartbeat.run.status', agent.teamId, {
          agentId: agent.id,
          taskId: task.id,
          runId: result.runId,
          status: result.status,
        });

        results.push(result);
      }

      return results;
    },

    /** Evaluate cron-based routine triggers and create tasks when due. */
    tickScheduledTriggers(): void {
      const now = new Date();

      const activeRoutines = database.db
        .select()
        .from(routines)
        .where(eq(routines.status, 'active'))
        .all();

      for (const routine of activeRoutines) {
        if (!routine.cronExpression) continue;

        const parsed = parseCron(routine.cronExpression);
        if (!parsed) continue;

        if (!cronMatches(parsed, now)) continue;

        // Check concurrency policy — skip if agent is already running
        if (routine.concurrencyPolicy === 'coalesce') {
          const agentRow = database.db
            .select()
            .from(agents)
            .where(eq(agents.id, routine.assigneeAgentId))
            .get();
          if (agentRow && agentRow.status === 'running') continue;
        }

        // Prevent double-trigger within same minute
        if (routine.lastTriggeredAt) {
          const lastTrigger = new Date(routine.lastTriggeredAt);
          if (
            lastTrigger.getFullYear() === now.getFullYear() &&
            lastTrigger.getMonth() === now.getMonth() &&
            lastTrigger.getDate() === now.getDate() &&
            lastTrigger.getHours() === now.getHours() &&
            lastTrigger.getMinutes() === now.getMinutes()
          ) {
            continue;
          }
        }

        // Create task from routine
        try {
          tasksService.create(routine.teamId, {
            title: routine.title,
            description: routine.description ?? undefined,
            assigneeAgentId: routine.assigneeAgentId,
            projectId: routine.projectId ?? undefined,
            status: 'todo',
            priority: 'medium',
            originKind: 'routine',
          });

          // Update last triggered timestamp
          database.db
            .update(routines)
            .set({ lastTriggeredAt: now.getTime(), updatedAt: now.getTime() })
            .where(eq(routines.id, routine.id))
            .run();

          emitEvent('routine.triggered', routine.teamId, {
            routineId: routine.id,
            title: routine.title,
          });

          logger.info({ routineId: routine.id, title: routine.title }, 'Routine triggered');
        } catch (err) {
          logger.error({ routineId: routine.id, err }, 'Failed to trigger routine');
        }
      }
    },

    /** Clean up runs stuck in 'running' state beyond timeout. */
    reapOrphanedRuns(): void {
      const cutoff = Date.now() - ORPHAN_TIMEOUT_MS;

      const orphaned = database.db
        .select()
        .from(runs)
        .where(and(eq(runs.status, 'running'), lt(runs.startedAt, cutoff)))
        .all();

      for (const run of orphaned) {
        database.db
          .update(runs)
          .set({
            status: 'failed',
            error: 'Orphaned run reaped by scheduler',
            errorCode: 'ORPHAN_REAPED',
            finishedAt: Date.now(),
            updatedAt: Date.now(),
          })
          .where(eq(runs.id, run.id))
          .run();

        // Reset agent status to idle
        database.db
          .update(agents)
          .set({ status: 'idle', updatedAt: Date.now() })
          .where(eq(agents.id, run.agentId))
          .run();

        emitEvent('heartbeat.run.status', run.teamId, {
          runId: run.id,
          agentId: run.agentId,
          status: 'failed',
          reason: 'orphan_reaped',
        });

        logger.warn({ runId: run.id, agentId: run.agentId }, 'Reaped orphaned run');
      }
    },

    start(intervalMs = 60_000) {
      if (timer) return;
      timer = setInterval(() => {
        this.tick().catch((err) => {
          logger.error({ err }, 'Scheduler tick failed');
        });
      }, intervalMs);
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
