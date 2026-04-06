import { eq, and, asc, desc, gt } from 'drizzle-orm';
import { taskComments, tasks, runs } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createCommentsService(database: Database) {
  const { db } = database;

  return {
    create(data: {
      teamId: string;
      taskId: string;
      authorAgentId?: string;
      authorType: string;
      body: string;
      reopen?: boolean;
      interrupt?: boolean;
    }) {
      const now = Date.now();
      const id = generateId('cmt');
      const row = {
        id,
        teamId: data.teamId,
        taskId: data.taskId,
        authorAgentId: data.authorAgentId ?? null,
        authorType: data.authorType,
        body: data.body,
        createdAt: now,
      };
      db.insert(taskComments).values(row).run();

      // Reopen: move done → todo
      if (data.reopen) {
        const task = db
          .select()
          .from(tasks)
          .where(and(eq(tasks.teamId, data.teamId), eq(tasks.id, data.taskId)))
          .get();
        if (task && task.status === 'done') {
          db.update(tasks)
            .set({ status: 'todo', completedAt: null })
            .where(and(eq(tasks.teamId, data.teamId), eq(tasks.id, data.taskId)))
            .run();
        }
      }

      // Interrupt: cancel active run, unlock task
      if (data.interrupt) {
        const task = db
          .select()
          .from(tasks)
          .where(and(eq(tasks.teamId, data.teamId), eq(tasks.id, data.taskId)))
          .get();
        if (task?.checkoutRunId) {
          db.update(runs)
            .set({ status: 'cancelled' })
            .where(eq(runs.id, task.checkoutRunId))
            .run();
          db.update(tasks)
            .set({ checkoutRunId: null, executionLockedAt: null, status: 'todo' })
            .where(and(eq(tasks.teamId, data.teamId), eq(tasks.id, data.taskId)))
            .run();
        }
      }

      return row;
    },

    listByTask(
      teamId: string,
      taskId: string,
      opts?: { limit?: number; afterId?: string; order?: 'asc' | 'desc' },
    ) {
      const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 500);
      const order = opts?.order === 'desc' ? desc(taskComments.createdAt) : asc(taskComments.createdAt);

      const conditions = [
        eq(taskComments.teamId, teamId),
        eq(taskComments.taskId, taskId),
      ];

      if (opts?.afterId) {
        const cursor = db
          .select({ createdAt: taskComments.createdAt })
          .from(taskComments)
          .where(eq(taskComments.id, opts.afterId))
          .get();
        if (cursor) {
          conditions.push(gt(taskComments.createdAt, cursor.createdAt));
        }
      }

      return db
        .select()
        .from(taskComments)
        .where(and(...conditions))
        .orderBy(order)
        .limit(limit)
        .all();
    },
  };
}
