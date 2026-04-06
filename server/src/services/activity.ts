import { eq, desc } from 'drizzle-orm';
import { activityLog } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createActivityService(database: Database) {
  const { db } = database;

  return {
    log(data: {
      teamId: string;
      actorType: string;
      actorId?: string;
      action: string;
      entityType: string;
      entityId: string;
      detail?: Record<string, unknown>;
    }) {
      const now = Date.now();
      const id = generateId('act');
      const row = {
        id,
        teamId: data.teamId,
        actorType: data.actorType,
        actorId: data.actorId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        detail: data.detail ? JSON.stringify(data.detail) : null,
        createdAt: now,
      };
      db.insert(activityLog).values(row).run();
      return row;
    },

    list(teamId: string, limit = 50) {
      return db.select().from(activityLog)
        .where(eq(activityLog.teamId, teamId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit)
        .all();
    },
  };
}
