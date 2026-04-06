import { eq, and } from 'drizzle-orm';
import { routines } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export function createRoutinesService(
  database: Database,
  tasksService: { create(teamId: string, data: any): any },
) {
  const { db } = database;

  return {
    list(teamId: string) {
      return db.select().from(routines).where(eq(routines.teamId, teamId)).all();
    },

    getById(teamId: string, id: string) {
      return db.select().from(routines).where(and(eq(routines.teamId, teamId), eq(routines.id, id))).get();
    },

    create(data: {
      teamId: string;
      title: string;
      description?: string;
      assigneeAgentId: string;
      cronExpression?: string;
      projectId?: string;
      timezone?: string;
    }) {
      const now = Date.now();
      const id = generateId('rtn');
      const row = {
        id,
        teamId: data.teamId,
        title: data.title,
        description: data.description ?? null,
        assigneeAgentId: data.assigneeAgentId,
        cronExpression: data.cronExpression ?? null,
        projectId: data.projectId ?? null,
        timezone: data.timezone ?? 'Asia/Seoul',
        status: 'active' as const,
        concurrencyPolicy: 'coalesce' as const,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(routines).values(row).run();
      return row;
    },

    update(teamId: string, id: string, data: { status?: string; title?: string; cronExpression?: string }) {
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (data.status !== undefined) updates.status = data.status;
      if (data.title !== undefined) updates.title = data.title;
      if (data.cronExpression !== undefined) updates.cronExpression = data.cronExpression;

      db.update(routines).set(updates).where(and(eq(routines.teamId, teamId), eq(routines.id, id))).run();
      return db.select().from(routines).where(and(eq(routines.teamId, teamId), eq(routines.id, id))).get();
    },

    trigger(teamId: string, routineId: string): any | null {
      const routine = db.select().from(routines).where(
        and(eq(routines.teamId, teamId), eq(routines.id, routineId)),
      ).get();

      if (!routine || routine.status !== 'active') return null;

      // Create task from routine
      const task = tasksService.create(teamId, {
        title: `[Routine] ${routine.title}`,
        description: routine.description,
        status: 'todo',
        assigneeAgentId: routine.assigneeAgentId,
        projectId: routine.projectId,
        originKind: 'routine',
      });

      // Update routine trigger time
      const now = Date.now();
      db.update(routines)
        .set({ lastTriggeredAt: now, updatedAt: now })
        .where(eq(routines.id, routineId))
        .run();

      return task;
    },
  };
}
