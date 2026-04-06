import { eq, and, asc } from 'drizzle-orm';
import { taskComments } from '@cco/db';
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
      return row;
    },

    listByTask(teamId: string, taskId: string) {
      return db
        .select()
        .from(taskComments)
        .where(and(eq(taskComments.teamId, teamId), eq(taskComments.taskId, taskId)))
        .orderBy(asc(taskComments.createdAt))
        .all();
    },
  };
}
