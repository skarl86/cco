import { eq } from 'drizzle-orm';
import { teams } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createTeamsService(database: Database) {
  const { db } = database;

  return {
    list() {
      return db.select().from(teams).all();
    },

    getById(id: string) {
      return db.select().from(teams).where(eq(teams.id, id)).get();
    },

    create(data: { name: string; description?: string; taskPrefix?: string }) {
      const now = Date.now();
      const id = generateId('team');
      const row = {
        id,
        name: data.name,
        description: data.description ?? null,
        status: 'active' as const,
        taskPrefix: data.taskPrefix ?? 'CCO',
        taskCounter: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(teams).values(row).run();
      return row;
    },

    update(id: string, data: { name?: string; description?: string; status?: string }) {
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;
      if (data.status !== undefined) updates.status = data.status;

      db.update(teams).set(updates).where(eq(teams.id, id)).run();
      return db.select().from(teams).where(eq(teams.id, id)).get();
    },
  };
}
