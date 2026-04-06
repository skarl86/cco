import { eq, and, desc } from 'drizzle-orm';
import { workProducts } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createWorkProductsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string, taskId: string, type?: string) {
      const conditions = [
        eq(workProducts.teamId, teamId),
        eq(workProducts.taskId, taskId),
      ];
      if (type) {
        conditions.push(eq(workProducts.type, type));
      }
      return db
        .select()
        .from(workProducts)
        .where(and(...conditions))
        .orderBy(desc(workProducts.isPrimary), desc(workProducts.updatedAt))
        .all();
    },

    getById(teamId: string, id: string) {
      return db
        .select()
        .from(workProducts)
        .where(and(eq(workProducts.teamId, teamId), eq(workProducts.id, id)))
        .get();
    },

    create(
      teamId: string,
      data: {
        taskId: string;
        type: string;
        provider: string;
        title: string;
        externalId?: string;
        url?: string;
        status?: string;
        reviewState?: string;
        isPrimary?: boolean;
        summary?: string;
        metadata?: Record<string, unknown>;
        runId?: string;
        workspaceId?: string;
      },
    ) {
      const now = Date.now();
      const id = generateId('wp');
      const isPrimary = data.isPrimary ? 1 : 0;

      // If setting as primary, demote existing primary of same task+type
      if (isPrimary) {
        db.update(workProducts)
          .set({ isPrimary: 0, updatedAt: now })
          .where(
            and(
              eq(workProducts.teamId, teamId),
              eq(workProducts.taskId, data.taskId),
              eq(workProducts.type, data.type),
              eq(workProducts.isPrimary, 1),
            ),
          )
          .run();
      }

      const row = {
        id,
        teamId,
        taskId: data.taskId,
        runId: data.runId ?? null,
        workspaceId: data.workspaceId ?? null,
        type: data.type,
        provider: data.provider,
        externalId: data.externalId ?? null,
        title: data.title,
        url: data.url ?? null,
        status: data.status ?? 'active',
        reviewState: data.reviewState ?? 'none',
        isPrimary,
        healthStatus: 'unknown' as const,
        summary: data.summary ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        createdAt: now,
        updatedAt: now,
      };

      db.insert(workProducts).values(row).run();
      return row;
    },

    update(teamId: string, id: string, patch: Record<string, unknown>) {
      const existing = db
        .select()
        .from(workProducts)
        .where(and(eq(workProducts.teamId, teamId), eq(workProducts.id, id)))
        .get();
      if (!existing) return undefined;

      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };

      for (const key of [
        'title',
        'url',
        'externalId',
        'status',
        'reviewState',
        'healthStatus',
        'summary',
      ]) {
        if (patch[key] !== undefined) updates[key] = patch[key];
      }
      if (patch.metadata !== undefined) {
        updates.metadata = JSON.stringify(patch.metadata);
      }
      if (patch.isPrimary !== undefined) {
        const val = patch.isPrimary ? 1 : 0;
        updates.isPrimary = val;
        if (val === 1) {
          db.update(workProducts)
            .set({ isPrimary: 0, updatedAt: now })
            .where(
              and(
                eq(workProducts.teamId, teamId),
                eq(workProducts.taskId, existing.taskId),
                eq(workProducts.type, existing.type),
                eq(workProducts.isPrimary, 1),
              ),
            )
            .run();
        }
      }

      db.update(workProducts)
        .set(updates)
        .where(eq(workProducts.id, id))
        .run();

      return db
        .select()
        .from(workProducts)
        .where(eq(workProducts.id, id))
        .get();
    },

    remove(teamId: string, id: string) {
      const existing = db
        .select()
        .from(workProducts)
        .where(and(eq(workProducts.teamId, teamId), eq(workProducts.id, id)))
        .get();
      if (!existing) return undefined;
      db.delete(workProducts).where(eq(workProducts.id, id)).run();
      return existing;
    },
  };
}
