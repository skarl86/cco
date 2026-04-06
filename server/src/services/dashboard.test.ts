import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, agents, tasks, runs, projects, routines, approvals } from '@cco/db';
import { createDashboardService } from './dashboard.js';

describe('DashboardService', () => {
  let database: Database;
  let service: ReturnType<typeof createDashboardService>;

  afterAll(() => database.close());

  describe('with populated team', () => {
    const teamId = 'team_dash';

    beforeAll(() => {
      database = createDatabase(':memory:');
      service = createDashboardService(database);
      const now = Date.now();

      database.db.insert(teams).values({
        id: teamId, name: 'Dash Team', status: 'active',
        taskPrefix: 'DT', taskCounter: 0, createdAt: now, updatedAt: now,
      }).run();

      // Insert 2 agents: 1 idle, 1 running
      database.db.insert(agents).values({
        id: 'agent_d1', teamId, name: 'Agent 1', role: 'general',
        status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
        budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
        createdAt: now, updatedAt: now,
      }).run();
      database.db.insert(agents).values({
        id: 'agent_d2', teamId, name: 'Agent 2', role: 'general',
        status: 'running', adapterType: 'claude_code', adapterConfig: '{}',
        budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
        createdAt: now, updatedAt: now,
      }).run();

      // Insert tasks: 1 todo, 1 in_progress
      database.db.insert(tasks).values({
        id: 'task_d1', teamId, title: 'Task 1', status: 'todo',
        priority: 'medium', taskNumber: 1, identifier: 'DT-1',
        originKind: 'manual', createdAt: now, updatedAt: now,
      }).run();
      database.db.insert(tasks).values({
        id: 'task_d2', teamId, title: 'Task 2', status: 'in_progress',
        priority: 'high', taskNumber: 2, identifier: 'DT-2',
        originKind: 'manual', createdAt: now, updatedAt: now,
      }).run();

      // Insert 1 completed run
      database.db.insert(runs).values({
        id: 'run_d1', teamId, agentId: 'agent_d1', status: 'completed',
        invocationSource: 'on_demand', createdAt: now, updatedAt: now,
      }).run();

      // Insert 1 active project
      database.db.insert(projects).values({
        id: 'proj_d1', teamId, name: 'Dashboard Proj', status: 'active',
        createdAt: now, updatedAt: now,
      }).run();

      // Insert 1 active routine
      database.db.insert(routines).values({
        id: 'rtn_d1', teamId, title: 'Nightly Build',
        assigneeAgentId: 'agent_d1', status: 'active',
        concurrencyPolicy: 'skip', timezone: 'UTC',
        createdAt: now, updatedAt: now,
      }).run();

      // Insert 1 pending approval
      database.db.insert(approvals).values({
        id: 'appr_d1', teamId, type: 'tool_call',
        requestedByAgentId: 'agent_d1', status: 'pending',
        payload: '{"tool":"bash","input":"{}"}',
        createdAt: now, updatedAt: now,
      }).run();
    });

    it('returns correct agent counts', () => {
      const dash = service.getDashboard(teamId);
      expect(dash.agents.total).toBe(2);
      expect(dash.agents.idle).toBe(1);
      expect(dash.agents.running).toBe(1);
    });

    it('returns correct task counts', () => {
      const dash = service.getDashboard(teamId);
      expect(dash.tasks.total).toBe(2);
      expect(dash.tasks.todo).toBe(1);
      expect(dash.tasks.inProgress).toBe(1);
      expect(dash.tasks.done).toBe(0);
    });

    it('returns correct run counts', () => {
      const dash = service.getDashboard(teamId);
      expect(dash.runs.total).toBe(1);
      expect(dash.runs.completed).toBe(1);
      expect(dash.runs.running).toBe(0);
    });

    it('returns correct project counts', () => {
      const dash = service.getDashboard(teamId);
      expect(dash.projects.total).toBe(1);
      expect(dash.projects.active).toBe(1);
    });

    it('returns correct routine counts', () => {
      const dash = service.getDashboard(teamId);
      expect(dash.routines.total).toBe(1);
      expect(dash.routines.active).toBe(1);
    });

    it('returns pending approval count', () => {
      const dash = service.getDashboard(teamId);
      expect(dash.approvals.pending).toBe(1);
    });

    it('returns sidebar badges', () => {
      const badges = service.getSidebarBadges(teamId);
      expect(badges.pendingApprovals).toBe(1);
      expect(badges.runningAgents).toBe(1);
      expect(badges.errorAgents).toBe(0);
    });
  });

  describe('with empty team', () => {
    const emptyTeamId = 'team_dash_empty';

    beforeAll(() => {
      const now = Date.now();
      database.db.insert(teams).values({
        id: emptyTeamId, name: 'Empty Team', status: 'active',
        taskPrefix: 'ET', taskCounter: 0, createdAt: now, updatedAt: now,
      }).run();
    });

    it('returns all zeros for an empty team', () => {
      const dash = service.getDashboard(emptyTeamId);
      expect(dash.agents.total).toBe(0);
      expect(dash.tasks.total).toBe(0);
      expect(dash.runs.total).toBe(0);
      expect(dash.projects.total).toBe(0);
      expect(dash.routines.total).toBe(0);
      expect(dash.approvals.pending).toBe(0);
      expect(dash.costs.totalCents).toBe(0);
      expect(dash.costs.monthCents).toBe(0);
    });

    it('returns all-zero sidebar badges for empty team', () => {
      const badges = service.getSidebarBadges(emptyTeamId);
      expect(badges.pendingApprovals).toBe(0);
      expect(badges.runningAgents).toBe(0);
      expect(badges.errorAgents).toBe(0);
    });
  });
});
