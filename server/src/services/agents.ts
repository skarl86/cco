import { eq, and } from 'drizzle-orm';
import { agents } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createAgentsService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string) {
      return db.select().from(agents).where(eq(agents.teamId, teamId)).all();
    },

    getById(teamId: string, id: string) {
      return db
        .select()
        .from(agents)
        .where(and(eq(agents.teamId, teamId), eq(agents.id, id)))
        .get();
    },

    create(
      teamId: string,
      data: {
        name: string;
        role?: string;
        title?: string;
        reportsTo?: string;
        adapterType?: string;
        adapterConfig?: Record<string, unknown>;
        budgetMonthlyCents?: number;
      },
    ) {
      const now = Date.now();
      const id = generateId('agent');
      const row = {
        id,
        teamId,
        name: data.name,
        role: data.role ?? 'general',
        title: data.title ?? null,
        status: 'idle' as const,
        reportsTo: data.reportsTo ?? null,
        adapterType: data.adapterType ?? 'claude_code',
        adapterConfig: JSON.stringify(data.adapterConfig ?? {}),
        budgetMonthlyCents: data.budgetMonthlyCents ?? 0,
        spentMonthlyCents: 0,
        permissions: '{}',
        createdAt: now,
        updatedAt: now,
      };
      db.insert(agents).values(row).run();
      return { ...row, adapterConfig: data.adapterConfig ?? {} };
    },

    update(
      teamId: string,
      id: string,
      data: {
        name?: string;
        role?: string;
        title?: string;
        status?: string;
        adapterConfig?: Record<string, unknown>;
        budgetMonthlyCents?: number;
      },
    ) {
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (data.name !== undefined) updates.name = data.name;
      if (data.role !== undefined) updates.role = data.role;
      if (data.title !== undefined) updates.title = data.title;
      if (data.status !== undefined) updates.status = data.status;
      if (data.adapterConfig !== undefined) updates.adapterConfig = JSON.stringify(data.adapterConfig);
      if (data.budgetMonthlyCents !== undefined) updates.budgetMonthlyCents = data.budgetMonthlyCents;

      db.update(agents).set(updates).where(and(eq(agents.teamId, teamId), eq(agents.id, id))).run();
      return db.select().from(agents).where(and(eq(agents.teamId, teamId), eq(agents.id, id))).get();
    },

    remove(teamId: string, id: string) {
      db.delete(agents).where(and(eq(agents.teamId, teamId), eq(agents.id, id))).run();
    },
  };
}
