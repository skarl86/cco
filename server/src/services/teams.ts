import { eq } from 'drizzle-orm';
import {
  teams,
  activityLog,
  taskComments,
  feedback,
  documents,
  costEvents,
  runs,
  tasks,
  approvals,
  routines,
  routineTriggers,
  routineRuns,
  projects,
  goals,
  agents,
  agentApiKeys,
  budgetPolicies,
} from '@cco/db';
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

    remove(id: string) {
      // Cascade delete all related data in dependency order
      db.delete(activityLog).where(eq(activityLog.teamId, id)).run();
      db.delete(taskComments).where(eq(taskComments.teamId, id)).run();
      db.delete(feedback).where(eq(feedback.teamId, id)).run();
      db.delete(documents).where(eq(documents.teamId, id)).run();
      db.delete(costEvents).where(eq(costEvents.teamId, id)).run();
      db.delete(runs).where(eq(runs.teamId, id)).run();
      db.delete(tasks).where(eq(tasks.teamId, id)).run();
      db.delete(approvals).where(eq(approvals.teamId, id)).run();
      db.delete(routineRuns).where(eq(routineRuns.teamId, id)).run();
      db.delete(routineTriggers).where(eq(routineTriggers.teamId, id)).run();
      db.delete(routines).where(eq(routines.teamId, id)).run();
      db.delete(projects).where(eq(projects.teamId, id)).run();
      db.delete(goals).where(eq(goals.teamId, id)).run();
      db.delete(agents).where(eq(agents.teamId, id)).run();
      db.delete(agentApiKeys).where(eq(agentApiKeys.teamId, id)).run();
      db.delete(budgetPolicies).where(eq(budgetPolicies.teamId, id)).run();
      db.delete(teams).where(eq(teams.id, id)).run();
    },
  };
}
