import { eq, and, isNull, asc } from 'drizzle-orm';
import { tasks } from '@cco/db';
import type { Database } from '@cco/db';

export interface CheckoutResult {
  readonly success: boolean;
  readonly error?: string;
}

export function createCheckoutService(database: Database) {
  const { db } = database;

  return {
    checkout(teamId: string, taskId: string, agentId: string, runId: string): CheckoutResult {
      const task = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, taskId)))
        .get();

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      if (task.checkoutRunId) {
        return { success: false, error: `Task already checked out by run ${task.checkoutRunId}` };
      }

      if (task.status !== 'todo' && task.status !== 'backlog') {
        return { success: false, error: `Task status '${task.status}' is not eligible for checkout` };
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

      return { success: true };
    },

    release(teamId: string, taskId: string, newStatus?: string): void {
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
