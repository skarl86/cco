import { eq, and, sql, lt } from 'drizzle-orm';
import { agents, runs, routines, workProducts } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';
import type { ExecutionService, RunResult } from './execution.js';
import { parseCron, cronMatches } from './cron.js';
import { emitEvent } from '../realtime/live-events.js';
import { logger } from '../middleware/logger.js';
import { execFileSync } from 'node:child_process';

/** Get current git HEAD hash. Returns null if not a git repo. */
function getGitHead(): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(), timeout: 3000,
    }).toString().trim();
  } catch {
    return null;
  }
}

/**
 * Auto-detect git work products by comparing HEAD before and after agent execution.
 * Only registers commits that the agent actually created during this run.
 */
function autoDetectWorkProducts(
  database: Database,
  teamId: string,
  taskId: string,
  runId: string,
  beforeHead: string | null,
): void {
  if (!beforeHead) return;
  const { db } = database;
  const cwd = process.cwd();

  try {
    const afterHead = getGitHead();
    if (!afterHead || afterHead === beforeHead) return;

    // Get commits between before and after HEAD
    const gitLog = execFileSync('git', [
      'log', `${beforeHead}..${afterHead}`, '--format=%h|%s',
    ], { cwd, timeout: 5000 }).toString().trim();

    if (!gitLog) return;

    for (const line of gitLog.split('\n').filter(Boolean)) {
      const sepIdx = line.indexOf('|');
      if (sepIdx < 0) continue;
      const shortHash = line.slice(0, sepIdx);
      const message = line.slice(sepIdx + 1);

      // Skip if already registered
      const existing = db.select().from(workProducts)
        .where(and(
          eq(workProducts.teamId, teamId),
          eq(workProducts.taskId, taskId),
          eq(workProducts.type, 'commit'),
          eq(workProducts.externalId, shortHash),
        )).get();
      if (existing) continue;

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

    // Detect current branch (if changed from main)
    const branch = execFileSync('git', ['branch', '--show-current'], {
      cwd, timeout: 3000,
    }).toString().trim();

    if (branch && branch !== 'main' && branch !== 'master') {
      const existing = db.select().from(workProducts)
        .where(and(
          eq(workProducts.teamId, teamId),
          eq(workProducts.taskId, taskId),
          eq(workProducts.type, 'branch'),
          eq(workProducts.externalId, branch),
        )).get();

      if (!existing) {
        const now = Date.now();
        db.insert(workProducts).values({
          id: generateId('wp'),
          teamId,
          taskId,
          runId,
          type: 'branch',
          provider: 'local',
          externalId: branch,
          title: branch,
          status: 'active',
          reviewState: 'none',
          isPrimary: 0,
          healthStatus: 'unknown',
          createdAt: now,
          updatedAt: now,
        }).run();

        logger.info({ taskId, branch }, 'Auto-detected branch work product');
      }
    }
  } catch (err) {
    logger.debug({ taskId, err }, 'Work product auto-detection skipped');
  }
}

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

        // Capture git HEAD before execution for work product detection
        const beforeHead = getGitHead();
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
          // Auto-detect work products by comparing git HEAD before/after run
          autoDetectWorkProducts(database, agent.teamId, task.id, result.runId, beforeHead);
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
