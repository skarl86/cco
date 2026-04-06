import { eq, and, isNull, asc, inArray } from 'drizzle-orm';
import { tasks, runs } from '@cco/db';
import type { Database } from '@cco/db';

export interface CheckoutResult {
  readonly success: boolean;
  readonly error?: 'task_not_found' | 'status_not_eligible' | 'already_checked_out';
  readonly note?: 'stale_adopted';
}

const TERMINAL_RUN_STATUSES = ['completed', 'failed', 'cancelled'];

export function createCheckoutService(database: Database) {
  const { db } = database;

  return {
    checkout(
      teamId: string,
      taskId: string,
      agentId: string,
      runId: string,
      expectedStatuses?: string[],
    ): CheckoutResult {
      const eligible = expectedStatuses ?? ['todo', 'backlog'];

      const task = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, taskId)))
        .get();

      if (!task) {
        return { success: false, error: 'task_not_found' };
      }

      if (!eligible.includes(task.status)) {
        return { success: false, error: 'status_not_eligible' };
      }

      // Stale run detection: if task is already checked out, check if that run is terminal
      let staleAdopted = false;
      if (task.checkoutRunId) {
        const existingRun = db
          .select()
          .from(runs)
          .where(eq(runs.id, task.checkoutRunId))
          .get();

        const isTerminal =
          !existingRun || TERMINAL_RUN_STATUSES.includes(existingRun.status);

        if (isTerminal) {
          staleAdopted = true;
        } else {
          return { success: false, error: 'already_checked_out' };
        }
      }

      const now = Date.now();
      db.update(tasks)
        .set({
          assigneeAgentId: agentId,
          checkoutRunId: runId,
          executionLockedAt: now,
          status: 'in_progress',
          startedAt: task.startedAt ?? now,
          updatedAt: now,
        })
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, taskId)))
        .run();

      if (staleAdopted) {
        return { success: true, note: 'stale_adopted' };
      }

      return { success: true };
    },

    release(
      teamId: string,
      taskId: string,
      newStatus?: string,
      actorAgentId?: string,
      actorRunId?: string,
    ): void {
      const task = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, taskId)))
        .get();

      if (!task) return;

      // Validate actor matches current assignee / run
      if (actorAgentId && task.assigneeAgentId && actorAgentId !== task.assigneeAgentId) {
        return;
      }
      if (actorRunId && task.checkoutRunId && actorRunId !== task.checkoutRunId) {
        return;
      }

      const now = Date.now();
      const updates: Record<string, unknown> = {
        checkoutRunId: null,
        executionLockedAt: null,
        updatedAt: now,
      };

      if (newStatus) {
        updates.status = newStatus;
        if (newStatus === 'done') {
          updates.completedAt = now;
        }
      }

      db.update(tasks)
        .set(updates)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, taskId)))
        .run();
    },

    pickNextTask(teamId: string, _agentId: string) {
      return db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.teamId, teamId),
            eq(tasks.status, 'todo'),
            isNull(tasks.checkoutRunId),
          ),
        )
        .orderBy(asc(tasks.createdAt))
        .get();
    },
  };
}
