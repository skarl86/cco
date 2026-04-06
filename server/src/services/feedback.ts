import { eq, and, desc, sql } from 'drizzle-orm';
import { feedback } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createFeedbackService(database: Database) {
  const { db } = database;

  return {
    list(
      teamId: string,
      opts?: {
        targetType?: string;
        targetId?: string;
        vote?: string;
        limit?: number;
      },
    ) {
      const conditions = [eq(feedback.teamId, teamId)];

      if (opts?.targetType) {
        conditions.push(eq(feedback.targetType, opts.targetType));
      }
      if (opts?.targetId) {
        conditions.push(eq(feedback.targetId, opts.targetId));
      }
      if (opts?.vote) {
        conditions.push(eq(feedback.vote, opts.vote));
      }

      const base = db
        .select()
        .from(feedback)
        .where(and(...conditions))
        .orderBy(desc(feedback.createdAt));

      return opts?.limit
        ? base.limit(opts.limit).all()
        : base.all();
    },

    getByTarget(teamId: string, targetType: string, targetId: string) {
      return db
        .select()
        .from(feedback)
        .where(
          and(
            eq(feedback.teamId, teamId),
            eq(feedback.targetType, targetType),
            eq(feedback.targetId, targetId),
          ),
        )
        .orderBy(desc(feedback.createdAt))
        .all();
    },

    create(
      teamId: string,
      data: {
        targetType: string;
        targetId: string;
        vote: string;
        reason?: string;
        actorType?: string;
        actorId?: string;
        payload?: Record<string, unknown>;
      },
    ) {
      const now = Date.now();
      const id = generateId('fb');

      const row = {
        id,
        teamId,
        targetType: data.targetType,
        targetId: data.targetId,
        vote: data.vote,
        reason: data.reason ?? null,
        actorType: data.actorType ?? 'user',
        actorId: data.actorId ?? null,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        createdAt: now,
      };

      db.insert(feedback).values(row).run();
      return row;
    },

    getSummary(teamId: string, targetType: string, targetId: string) {
      const result = db
        .select({
          vote: feedback.vote,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(feedback)
        .where(
          and(
            eq(feedback.teamId, teamId),
            eq(feedback.targetType, targetType),
            eq(feedback.targetId, targetId),
          ),
        )
        .groupBy(feedback.vote)
        .all();

      const summary = { up: 0, down: 0 };
      for (const row of result) {
        if (row.vote === 'up') summary.up = row.count;
        if (row.vote === 'down') summary.down = row.count;
      }
      return summary;
    },
  };
}
