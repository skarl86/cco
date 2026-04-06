import { eq, and, desc } from 'drizzle-orm';
import { approvals } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createApprovalsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string) {
      return db.select().from(approvals).where(eq(approvals.teamId, teamId))
        .orderBy(desc(approvals.createdAt)).all();
    },

    listPending(teamId: string) {
      return db.select().from(approvals).where(
        and(eq(approvals.teamId, teamId), eq(approvals.status, 'pending')),
      ).orderBy(desc(approvals.createdAt)).all();
    },

    getById(teamId: string, id: string) {
      return db.select().from(approvals).where(
        and(eq(approvals.teamId, teamId), eq(approvals.id, id)),
      ).get();
    },

    create(data: {
      teamId: string;
      type: string;
      requestedByAgentId?: string;
      payload: Record<string, unknown>;
    }) {
      const now = Date.now();
      const id = generateId('apr');
      const row = {
        id,
        teamId: data.teamId,
        type: data.type,
        requestedByAgentId: data.requestedByAgentId ?? null,
        status: 'pending' as const,
        payload: JSON.stringify(data.payload),
        createdAt: now,
        updatedAt: now,
      };
      db.insert(approvals).values(row).run();
      return { ...row, payload: data.payload };
    },

    decide(teamId: string, id: string, decision: 'approved' | 'rejected', note?: string) {
      const existing = db.select().from(approvals).where(
        and(eq(approvals.teamId, teamId), eq(approvals.id, id)),
      ).get();

      if (!existing) throw new Error('Approval not found');
      if (existing.status !== 'pending') throw new Error(`Approval already ${existing.status}`);

      const now = Date.now();
      db.update(approvals).set({
        status: decision,
        decisionNote: note ?? null,
        decidedAt: now,
        updatedAt: now,
      }).where(eq(approvals.id, id)).run();

      return db.select().from(approvals).where(eq(approvals.id, id)).get();
    },
  };
}
