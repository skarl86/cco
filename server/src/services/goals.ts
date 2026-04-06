import { eq, and } from 'drizzle-orm';
import { goals } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createGoalsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string, projectId?: string) {
      if (projectId) {
        return db
          .select()
          .from(goals)
          .where(and(eq(goals.teamId, teamId), eq(goals.projectId, projectId)))
          .all();
      }
      return db.select().from(goals).where(eq(goals.teamId, teamId)).all();
    },

    getById(teamId: string, id: string) {
      return db
        .select()
        .from(goals)
        .where(and(eq(goals.teamId, teamId), eq(goals.id, id)))
        .get();
    },

    create(
      teamId: string,
      data: {
        title: string;
        description?: string;
        projectId?: string;
        parentId?: string;
        priority?: string;
      },
    ) {
      const now = Date.now();
      const id = generateId('goal');
      const row = {
        id,
        teamId,
        title: data.title,
        description: data.description ?? null,
        projectId: data.projectId ?? null,
        parentId: data.parentId ?? null,
        status: 'active' as const,
        priority: data.priority ?? 'medium',
        createdAt: now,
        updatedAt: now,
      };
      db.insert(goals).values(row).run();
      return row;
    },

    update(
      teamId: string,
      id: string,
      data: {
        title?: string;
        description?: string;
        projectId?: string;
        parentId?: string;
        status?: string;
        priority?: string;
      },
    ) {
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.projectId !== undefined) updates.projectId = data.projectId;
      if (data.parentId !== undefined) updates.parentId = data.parentId;
      if (data.status !== undefined) updates.status = data.status;
      if (data.priority !== undefined) updates.priority = data.priority;

      db.update(goals)
        .set(updates)
        .where(and(eq(goals.teamId, teamId), eq(goals.id, id)))
        .run();
      return db
        .select()
        .from(goals)
        .where(and(eq(goals.teamId, teamId), eq(goals.id, id)))
        .get();
    },

    listChildren(teamId: string, parentId: string) {
      return db
        .select()
        .from(goals)
        .where(and(eq(goals.teamId, teamId), eq(goals.parentId, parentId)))
        .all();
    },
  };
}
