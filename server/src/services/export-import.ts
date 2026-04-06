import { eq } from 'drizzle-orm';
import { teams, agents, projects, tasks, goals, routines } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export interface TeamExport {
  readonly version: '1';
  readonly exportedAt: string;
  readonly team: {
    readonly name: string;
    readonly description: string | null;
    readonly status: string;
    readonly taskPrefix: string;
  };
  readonly agents: ReadonlyArray<{
    readonly name: string;
    readonly role: string;
    readonly adapterType: string;
    readonly adapterConfig: string;
    readonly permissions: string;
    readonly metadata?: Record<string, unknown>;
  }>;
  readonly projects: ReadonlyArray<{
    readonly name: string;
    readonly description: string | null;
    readonly status: string;
    readonly repoUrl: string | null;
    readonly baseBranch: string | null;
  }>;
  readonly tasks: ReadonlyArray<{
    readonly title: string;
    readonly description: string | null;
    readonly status: string;
    readonly priority: string;
    readonly identifier: string | null;
    readonly originKind: string;
    readonly goalId: string | null;
    readonly assigneeUserId: string | null;
    readonly requestDepth: number;
    readonly billingCode: string | null;
    readonly cancelledAt: number | null;
    readonly originId: string | null;
  }>;
  readonly goals: ReadonlyArray<{
    readonly title: string;
    readonly description: string | null;
    readonly status: string;
    readonly priority: string;
    readonly parentId: string | null;
  }>;
  readonly routines: ReadonlyArray<{
    readonly title: string;
    readonly description: string | null;
    readonly assigneeAgentId: string;
    readonly cronExpression: string | null;
    readonly concurrencyPolicy: string;
    readonly status: string;
  }>;
}

export interface ImportResult {
  readonly agents: number;
  readonly projects: number;
  readonly tasks: number;
  readonly goals: number;
  readonly routines: number;
}

export function createExportImportService(database: Database) {
  const { db } = database;

  return {
    exportTeam(teamId: string): TeamExport {
      const team = db.select().from(teams).where(eq(teams.id, teamId)).get();
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      const teamAgents = db.select().from(agents).where(eq(agents.teamId, teamId)).all();
      const teamProjects = db.select().from(projects).where(eq(projects.teamId, teamId)).all();
      const teamTasks = db.select().from(tasks).where(eq(tasks.teamId, teamId)).all();
      const teamGoals = db.select().from(goals).where(eq(goals.teamId, teamId)).all();
      const teamRoutines = db.select().from(routines).where(eq(routines.teamId, teamId)).all();

      return {
        version: '1',
        exportedAt: new Date().toISOString(),
        team: {
          name: team.name,
          description: team.description,
          status: team.status,
          taskPrefix: team.taskPrefix,
        },
        agents: teamAgents.map((a) => ({
          name: a.name,
          role: a.role,
          adapterType: a.adapterType,
          adapterConfig: a.adapterConfig,
          permissions: a.permissions,
        })),
        projects: teamProjects.map((p) => ({
          name: p.name,
          description: p.description,
          status: p.status,
          repoUrl: p.repoUrl,
          baseBranch: p.baseBranch,
        })),
        tasks: teamTasks.map((t) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          identifier: t.identifier,
          originKind: t.originKind,
          goalId: t.goalId,
          assigneeUserId: t.assigneeUserId,
          requestDepth: t.requestDepth,
          billingCode: t.billingCode,
          cancelledAt: t.cancelledAt,
          originId: t.originId,
        })),
        goals: teamGoals.map((g) => ({
          title: g.title,
          description: g.description,
          status: g.status,
          priority: g.priority,
          parentId: g.parentId,
        })),
        routines: teamRoutines.map((r) => ({
          title: r.title,
          description: r.description,
          assigneeAgentId: r.assigneeAgentId,
          cronExpression: r.cronExpression,
          concurrencyPolicy: r.concurrencyPolicy,
          status: r.status,
        })),
      };
    },

    importTeam(data: TeamExport, targetTeamId: string): ImportResult {
      const team = db.select().from(teams).where(eq(teams.id, targetTeamId)).get();
      if (!team) {
        throw new Error(`Target team ${targetTeamId} not found`);
      }

      const now = Date.now();

      for (const agent of data.agents) {
        db.insert(agents)
          .values({
            id: generateId('agent'),
            teamId: targetTeamId,
            name: agent.name,
            role: agent.role,
            title: null,
            status: 'idle',
            reportsTo: null,
            adapterType: agent.adapterType,
            adapterConfig: agent.adapterConfig,
            budgetMonthlyCents: 0,
            spentMonthlyCents: 0,
            permissions: agent.permissions,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      for (const project of data.projects) {
        db.insert(projects)
          .values({
            id: generateId('proj'),
            teamId: targetTeamId,
            name: project.name,
            description: project.description,
            status: project.status,
            repoUrl: project.repoUrl,
            repoPath: null,
            baseBranch: project.baseBranch,
            worktreeParentDir: null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      for (const task of data.tasks) {
        db.insert(tasks)
          .values({
            id: generateId('task'),
            teamId: targetTeamId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            identifier: task.identifier,
            taskNumber: 0,
            originKind: task.originKind,
            goalId: task.goalId ?? null,
            assigneeAgentId: null,
            assigneeUserId: task.assigneeUserId ?? null,
            projectId: null,
            requestDepth: task.requestDepth ?? 0,
            billingCode: task.billingCode ?? null,
            cancelledAt: task.cancelledAt ?? null,
            originId: task.originId ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      for (const goal of data.goals) {
        db.insert(goals)
          .values({
            id: generateId('goal'),
            teamId: targetTeamId,
            title: goal.title,
            description: goal.description,
            status: goal.status,
            priority: goal.priority,
            parentId: null,
            projectId: null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      for (const routine of data.routines) {
        db.insert(routines)
          .values({
            id: generateId('rtn'),
            teamId: targetTeamId,
            title: routine.title,
            description: routine.description,
            assigneeAgentId: routine.assigneeAgentId,
            cronExpression: routine.cronExpression,
            projectId: null,
            timezone: 'Asia/Seoul',
            status: routine.status,
            concurrencyPolicy: routine.concurrencyPolicy,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      return {
        agents: data.agents.length,
        projects: data.projects.length,
        tasks: data.tasks.length,
        goals: data.goals.length,
        routines: data.routines.length,
      };
    },
  };
}
