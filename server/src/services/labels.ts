import { eq, and, inArray } from 'drizzle-orm';
import { labels, taskLabels } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createLabelsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string) {
      return db
        .select()
        .from(labels)
        .where(eq(labels.teamId, teamId))
        .all();
    },

    create(teamId: string, data: { name: string; color?: string }) {
      const now = Date.now();
      const id = generateId('lbl');
      const row = {
        id,
        teamId,
        name: data.name,
        color: data.color ?? '#6B7280',
        createdAt: now,
      };
      db.insert(labels).values(row).run();
      return row;
    },

    delete(labelId: string): void {
      db.delete(taskLabels).where(eq(taskLabels.labelId, labelId)).run();
      db.delete(labels).where(eq(labels.id, labelId)).run();
    },

    syncTaskLabels(teamId: string, taskId: string, labelIds: string[]): void {
      // Remove all existing labels for this task
      db.delete(taskLabels).where(eq(taskLabels.taskId, taskId)).run();

      if (labelIds.length === 0) return;

      // Verify labels belong to the team
      const validLabels = db
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.teamId, teamId), inArray(labels.id, labelIds)))
        .all()
        .map((r) => r.id);

      for (const labelId of validLabels) {
        db.insert(taskLabels).values({ taskId, labelId }).run();
      }
    },

    getTaskLabels(teamId: string, taskId: string) {
      const labelIds = db
        .select({ labelId: taskLabels.labelId })
        .from(taskLabels)
        .where(eq(taskLabels.taskId, taskId))
        .all()
        .map((r) => r.labelId);

      if (labelIds.length === 0) return [];

      return db
        .select()
        .from(labels)
        .where(and(eq(labels.teamId, teamId), inArray(labels.id, labelIds)))
        .all();
    },
  };
}
