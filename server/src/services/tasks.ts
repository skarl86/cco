import { eq, and, desc, sql } from 'drizzle-orm';
import { tasks, teams } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  backlog: ['todo', 'cancelled'],
  todo: ['in_progress', 'backlog', 'cancelled'],
  in_progress: ['in_review', 'done', 'cancelled'],
  in_review: ['done', 'in_progress', 'cancelled'],
  done: [],
  cancelled: ['backlog'],
};

function validateTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
}

export function createTasksService(database: Database) {
  const { db } = database;

  function nextTaskNumber(teamId: string): { taskNumber: number; identifier: string } {
    // Atomic increment to prevent duplicate identifiers under concurrent writes
    db.update(teams)
      .set({ taskCounter: sql`task_counter + 1`, updatedAt: Date.now() })
      .where(eq(teams.id, teamId))
      .run();

    const team = db.select().from(teams).where(eq(teams.id, teamId)).get();
    if (!team) throw new Error(`Team ${teamId} not found`);

    return {
      taskNumber: team.taskCounter,
      identifier: `${team.taskPrefix}-${team.taskCounter}`,
    };
  }

  return {
    list(teamId: string, filters?: { status?: string; assigneeAgentId?: string }) {
      const conditions = [eq(tasks.teamId, teamId)];

      if (filters?.status) {
        conditions.push(eq(tasks.status, filters.status));
      }
      if (filters?.assigneeAgentId) {
        conditions.push(eq(tasks.assigneeAgentId, filters.assigneeAgentId));
      }

      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt))
        .all();
    },

    getById(teamId: string, id: string) {
      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, id)))
        .get();
    },

    listChildren(teamId: string, parentId: string) {
      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.parentId, parentId)))
        .all();
    },

    create(
      teamId: string,
      data: {
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        parentId?: string;
        projectId?: string;
        assigneeAgentId?: string;
        originKind?: string;
      },
    ) {
      const now = Date.now();
      const id = generateId('task');
      const { taskNumber, identifier } = nextTaskNumber(teamId);

      const row = {
        id,
        teamId,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        parentId: data.parentId ?? null,
        projectId: data.projectId ?? null,
        assigneeAgentId: data.assigneeAgentId ?? null,
        taskNumber,
        identifier,
        originKind: data.originKind ?? 'manual',
        createdAt: now,
        updatedAt: now,
      };

      db.insert(tasks).values(row).run();
      return row;
    },

    update(
      teamId: string,
      id: string,
      data: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        assigneeAgentId?: string | null;
      },
    ) {
      const existing = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, id)))
        .get();

      if (!existing) return undefined;

      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };

      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.priority !== undefined) updates.priority = data.priority;
      if (data.assigneeAgentId !== undefined) updates.assigneeAgentId = data.assigneeAgentId;

      if (data.status !== undefined && data.status !== existing.status) {
        validateTransition(existing.status, data.status);
        updates.status = data.status;

        if (data.status === 'in_progress' && !existing.startedAt) {
          updates.startedAt = now;
        }
        if (data.status === 'done') {
          updates.completedAt = now;
        }
      }

      db.update(tasks)
        .set(updates)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, id)))
        .run();

      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, id)))
        .get();
    },
  };
}
