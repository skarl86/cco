import { sql, eq, and, count } from 'drizzle-orm';
import { agents, tasks, runs, costEvents, projects, routines, approvals } from '@cco/db';
import type { Database } from '@cco/db';

export function createDashboardService(database: Database) {
  const { db } = database;

  return {
    getDashboard(teamId: string) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthMs = monthStart.getTime();

      // Agents
      const agentRows = db
        .select({ status: agents.status, cnt: count() })
        .from(agents)
        .where(eq(agents.teamId, teamId))
        .groupBy(agents.status)
        .all();

      const agentCounts = { total: 0, idle: 0, running: 0, paused: 0, error: 0 };
      for (const row of agentRows) {
        const n = row.cnt;
        agentCounts.total += n;
        if (row.status in agentCounts) {
          agentCounts[row.status as keyof typeof agentCounts] += n;
        }
      }

      // Tasks
      const taskRows = db
        .select({ status: tasks.status, cnt: count() })
        .from(tasks)
        .where(eq(tasks.teamId, teamId))
        .groupBy(tasks.status)
        .all();

      const taskCounts = {
        total: 0,
        backlog: 0,
        todo: 0,
        inProgress: 0,
        inReview: 0,
        blocked: 0,
        done: 0,
        cancelled: 0,
      };
      const taskStatusMap: Record<string, keyof typeof taskCounts> = {
        backlog: 'backlog',
        todo: 'todo',
        in_progress: 'inProgress',
        in_review: 'inReview',
        blocked: 'blocked',
        done: 'done',
        cancelled: 'cancelled',
      };
      for (const row of taskRows) {
        const n = row.cnt;
        taskCounts.total += n;
        const key = taskStatusMap[row.status];
        if (key) {
          taskCounts[key] += n;
        }
      }

      // Runs
      const runRows = db
        .select({ status: runs.status, cnt: count() })
        .from(runs)
        .where(eq(runs.teamId, teamId))
        .groupBy(runs.status)
        .all();

      const runCounts = { total: 0, running: 0, completed: 0, failed: 0, todayCount: 0 };
      for (const row of runRows) {
        const n = row.cnt;
        runCounts.total += n;
        if (row.status === 'running') runCounts.running += n;
        if (row.status === 'completed') runCounts.completed += n;
        if (row.status === 'failed') runCounts.failed += n;
      }

      const todayRunRow = db
        .select({ cnt: count() })
        .from(runs)
        .where(
          and(
            eq(runs.teamId, teamId),
            sql`${runs.createdAt} >= ${todayMs}`,
          ),
        )
        .get();
      runCounts.todayCount = todayRunRow?.cnt ?? 0;

      // Costs
      const totalCostRow = db
        .select({ total: sql<number>`coalesce(sum(${costEvents.costCents}), 0)` })
        .from(costEvents)
        .where(eq(costEvents.teamId, teamId))
        .get();

      const monthCostRow = db
        .select({ total: sql<number>`coalesce(sum(${costEvents.costCents}), 0)` })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.teamId, teamId),
            sql`${costEvents.occurredAt} >= ${monthMs}`,
          ),
        )
        .get();

      const costs = {
        totalCents: totalCostRow?.total ?? 0,
        monthCents: monthCostRow?.total ?? 0,
      };

      // Projects
      const projectRows = db
        .select({ status: projects.status, cnt: count() })
        .from(projects)
        .where(eq(projects.teamId, teamId))
        .groupBy(projects.status)
        .all();

      const projectCounts = { total: 0, active: 0 };
      for (const row of projectRows) {
        projectCounts.total += row.cnt;
        if (row.status === 'active') projectCounts.active += row.cnt;
      }

      // Routines
      const routineRows = db
        .select({ status: routines.status, cnt: count() })
        .from(routines)
        .where(eq(routines.teamId, teamId))
        .groupBy(routines.status)
        .all();

      const routineCounts = { total: 0, active: 0 };
      for (const row of routineRows) {
        routineCounts.total += row.cnt;
        if (row.status === 'active') routineCounts.active += row.cnt;
      }

      // Approvals
      const pendingApprovalRow = db
        .select({ cnt: count() })
        .from(approvals)
        .where(
          and(
            eq(approvals.teamId, teamId),
            eq(approvals.status, 'pending'),
          ),
        )
        .get();

      const approvalCounts = { pending: pendingApprovalRow?.cnt ?? 0 };

      return {
        agents: agentCounts,
        tasks: taskCounts,
        runs: runCounts,
        costs,
        projects: projectCounts,
        routines: routineCounts,
        approvals: approvalCounts,
      };
    },

    getSidebarBadges(teamId: string) {
      const pendingRow = db
        .select({ cnt: count() })
        .from(approvals)
        .where(
          and(
            eq(approvals.teamId, teamId),
            eq(approvals.status, 'pending'),
          ),
        )
        .get();

      const runningRow = db
        .select({ cnt: count() })
        .from(agents)
        .where(
          and(
            eq(agents.teamId, teamId),
            eq(agents.status, 'running'),
          ),
        )
        .get();

      const errorRow = db
        .select({ cnt: count() })
        .from(agents)
        .where(
          and(
            eq(agents.teamId, teamId),
            eq(agents.status, 'error'),
          ),
        )
        .get();

      return {
        pendingApprovals: pendingRow?.cnt ?? 0,
        runningAgents: runningRow?.cnt ?? 0,
        errorAgents: errorRow?.cnt ?? 0,
      };
    },
  };
}
