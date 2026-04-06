import { eq } from 'drizzle-orm';
import { agents } from '@cco/db';
import type { Database } from '@cco/db';
import type { ExecutionService } from './execution.js';
import type { RunResult } from './execution.js';

interface SchedulerDeps {
  readonly database: Database;
  readonly executionService: ExecutionService;
  readonly checkoutService: { pickNextTask(teamId: string, agentId: string): any; checkout(teamId: string, taskId: string, agentId: string, runId: string): any };
  readonly tasksService: { list(teamId: string, filters?: any): any[] };
}

export interface Scheduler {
  tick(): Promise<RunResult[]>;
  start(intervalMs?: number): void;
  stop(): void;
}

export function createScheduler(deps: SchedulerDeps): Scheduler {
  const { database, executionService, checkoutService } = deps;
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    async tick(): Promise<RunResult[]> {
      const results: RunResult[] = [];

      // Find all idle agents across all teams
      const idleAgents = database.db
        .select()
        .from(agents)
        .where(eq(agents.status, 'idle'))
        .all();

      for (const agent of idleAgents) {
        // Find next available todo task for this agent's team
        const task = checkoutService.pickNextTask(agent.teamId, agent.id);
        if (!task) continue;

        // Checkout BEFORE run to prevent race conditions
        const co = checkoutService.checkout(agent.teamId, task.id, agent.id, `pending-${agent.id}`);
        if (!co.success) continue; // Another agent grabbed it

        // Build prompt from task
        const prompt = `Task: ${task.title}\n${task.description ?? ''}\nIdentifier: ${task.identifier}`;

        const result = await executionService.startRun({
          teamId: agent.teamId,
          agentId: agent.id,
          taskId: task.id,
          prompt,
          invocationSource: 'heartbeat',
        });

        // Update task status based on run result
        if (result.status === 'failed') {
          checkoutService.release(agent.teamId, task.id, 'todo');
        } else {
          checkoutService.release(agent.teamId, task.id, 'done');
        }

        results.push(result);
      }

      return results;
    },

    start(intervalMs = 60_000) {
      if (timer) return;
      timer = setInterval(() => {
        this.tick().catch((err) => {
          console.error('Scheduler tick failed:', err);
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
