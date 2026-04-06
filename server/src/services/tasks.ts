import { eq, and, or, desc, sql, like, inArray } from 'drizzle-orm';
import { tasks, teams, taskComments, taskLabels } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  backlog: ['todo', 'cancelled'],
  todo: ['in_progress', 'backlog', 'cancelled'],
  in_progress: ['in_review', 'done', 'blocked', 'cancelled'],
  in_review: ['done', 'in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: [],
  cancelled: ['backlog'],
};

function validateTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
}

export interface TaskFilters {
  readonly status?: string;
  readonly assigneeAgentId?: string;
  readonly projectId?: string;
  readonly parentId?: string;
  readonly originKind?: string;
  readonly labelId?: string;
  readonly q?: string;
}

export function createTasksService(database: Database) {
  const { db } = database;

  function nextTaskNumber(teamId: string): { taskNumber: number; identifier: string } {
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
    list(teamId: string, filters?: TaskFilters) {
      const conditions = [eq(tasks.teamId, teamId)];

      // Multi-status filter (CSV: "todo,in_progress")
      if (filters?.status) {
        const statuses = filters.status.split(',').map((s) => s.trim()).filter(Boolean);
        if (statuses.length === 1) {
          conditions.push(eq(tasks.status, statuses[0]));
        } else if (statuses.length > 1) {
          conditions.push(inArray(tasks.status, statuses));
        }
      }

      if (filters?.assigneeAgentId) {
        conditions.push(eq(tasks.assigneeAgentId, filters.assigneeAgentId));
      }
      if (filters?.projectId) {
        conditions.push(eq(tasks.projectId, filters.projectId));
      }
      if (filters?.parentId) {
        conditions.push(eq(tasks.parentId, filters.parentId));
      }
      if (filters?.originKind) {
        conditions.push(eq(tasks.originKind, filters.originKind));
      }

      // Text search across title, identifier, description
      if (filters?.q) {
        const q = `%${filters.q}%`;
        conditions.push(
          or(
            like(tasks.title, q),
            like(tasks.identifier, q),
            like(tasks.description, q),
          )!,
        );
      }

      // Label filter via subquery
      if (filters?.labelId) {
        const taskIdsWithLabel = db
          .select({ taskId: taskLabels.taskId })
          .from(taskLabels)
          .where(eq(taskLabels.labelId, filters.labelId))
          .all()
          .map((r) => r.taskId);

        if (taskIdsWithLabel.length === 0) return [];
        conditions.push(inArray(tasks.id, taskIdsWithLabel));
      }

      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt))
        .all();
    },

    /** Get task by ID or identifier (e.g., "PROJ-42") */
    getById(teamId: string, idOrIdentifier: string) {
      // Try by ID first
      const byId = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, idOrIdentifier)))
        .get();
      if (byId) return byId;

      // Try by identifier
      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.identifier, idOrIdentifier)))
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
        goalId?: string;
        assigneeAgentId?: string;
        assigneeUserId?: string;
        originKind?: string;
        originId?: string;
        requestDepth?: number;
        billingCode?: string;
        createdByAgentId?: string;
        createdByUserId?: string;
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
        status: data.status ?? 'backlog',
        priority: data.priority ?? 'medium',
        parentId: data.parentId ?? null,
        projectId: data.projectId ?? null,
        goalId: data.goalId ?? null,
        assigneeAgentId: data.assigneeAgentId ?? null,
        assigneeUserId: data.assigneeUserId ?? null,
        taskNumber,
        identifier,
        originKind: data.originKind ?? 'manual',
        originId: data.originId ?? null,
        originRunId: null,
        requestDepth: data.requestDepth ?? 0,
        billingCode: data.billingCode ?? null,
        createdByAgentId: data.createdByAgentId ?? null,
        createdByUserId: data.createdByUserId ?? null,
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
        assigneeUserId?: string | null;
        goalId?: string | null;
        billingCode?: string | null;
        hiddenAt?: number | null;
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
      if (data.assigneeUserId !== undefined) updates.assigneeUserId = data.assigneeUserId;
      if (data.goalId !== undefined) updates.goalId = data.goalId;
      if (data.billingCode !== undefined) updates.billingCode = data.billingCode;
      if (data.hiddenAt !== undefined) updates.hiddenAt = data.hiddenAt;

      if (data.status !== undefined && data.status !== existing.status) {
        validateTransition(existing.status, data.status);
        updates.status = data.status;

        if (data.status === 'in_progress' && !existing.startedAt) {
          updates.startedAt = now;
        }
        if (data.status === 'done') {
          updates.completedAt = now;
        }
        if (data.status === 'cancelled') {
          updates.cancelledAt = now;
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

    /** Get heartbeat context for agent execution */
    getHeartbeatContext(teamId: string, taskId: string) {
      const task = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.id, taskId)))
        .get();

      if (!task) return undefined;

      const comments = db
        .select()
        .from(taskComments)
        .where(eq(taskComments.taskId, taskId))
        .orderBy(desc(taskComments.createdAt))
        .limit(10)
        .all();

      return { task, recentComments: comments };
    },
  };
}
