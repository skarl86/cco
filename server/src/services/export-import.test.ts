import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase, type Database, teams, agents, projects, tasks, goals, routines } from '@cco/db';
import { createExportImportService } from './export-import.js';

describe('ExportImportService', () => {
  let database: Database;
  let service: ReturnType<typeof createExportImportService>;
  const sourceTeamId = 'team_export_src';
  const targetTeamId = 'team_import_dst';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createExportImportService(database);
    const now = Date.now();

    // Create source team
    database.db.insert(teams).values({
      id: sourceTeamId, name: 'Source Team', status: 'active',
      taskPrefix: 'SRC', taskCounter: 2, createdAt: now, updatedAt: now,
    }).run();

    // Create target team (empty)
    database.db.insert(teams).values({
      id: targetTeamId, name: 'Target Team', status: 'active',
      taskPrefix: 'TGT', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    // Populate source team with entities
    database.db.insert(agents).values({
      id: 'agent_exp_1', teamId: sourceTeamId, name: 'Coder', role: 'developer',
      status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
      budgetMonthlyCents: 1000, spentMonthlyCents: 0, permissions: '{"read":true}',
      createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(projects).values({
      id: 'proj_exp_1', teamId: sourceTeamId, name: 'Main Project',
      description: 'The main project', status: 'active',
      repoUrl: 'https://github.com/test/repo', baseBranch: 'main',
      createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(tasks).values({
      id: 'task_exp_1', teamId: sourceTeamId, title: 'Setup CI',
      description: 'Configure CI pipeline', status: 'todo',
      priority: 'high', taskNumber: 1,
      originKind: 'manual', createdAt: now, updatedAt: now,
    }).run();
    database.db.insert(tasks).values({
      id: 'task_exp_2', teamId: sourceTeamId, title: 'Write tests',
      status: 'in_progress', priority: 'medium', taskNumber: 2,
      originKind: 'manual', createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(goals).values({
      id: 'goal_exp_1', teamId: sourceTeamId, title: 'Launch v1',
      description: 'Ship the first version', status: 'active',
      priority: 'high', createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(routines).values({
      id: 'rtn_exp_1', teamId: sourceTeamId, title: 'Daily standup',
      assigneeAgentId: 'agent_exp_1', cronExpression: '0 9 * * *',
      timezone: 'UTC', status: 'active', concurrencyPolicy: 'skip',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  describe('exportTeam', () => {
    it('exports the team structure', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(exported.version).toBe('1');
      expect(exported.exportedAt).toBeDefined();
      expect(exported.team.name).toBe('Source Team');
      expect(exported.team.taskPrefix).toBe('SRC');
    });

    it('exports agents', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(exported.agents.length).toBe(1);
      expect(exported.agents[0].name).toBe('Coder');
      expect(exported.agents[0].role).toBe('developer');
      expect(exported.agents[0].adapterType).toBe('claude_code');
    });

    it('exports projects', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(exported.projects.length).toBe(1);
      expect(exported.projects[0].name).toBe('Main Project');
      expect(exported.projects[0].baseBranch).toBe('main');
    });

    it('exports tasks', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(exported.tasks.length).toBe(2);
      const titles = exported.tasks.map((t) => t.title);
      expect(titles).toContain('Setup CI');
      expect(titles).toContain('Write tests');
    });

    it('exports goals', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(exported.goals.length).toBe(1);
      expect(exported.goals[0].title).toBe('Launch v1');
    });

    it('exports routines', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(exported.routines.length).toBe(1);
      expect(exported.routines[0].title).toBe('Daily standup');
      expect(exported.routines[0].cronExpression).toBe('0 9 * * *');
    });

    it('throws for non-existent team', () => {
      expect(() => service.exportTeam('team_nonexistent')).toThrow(
        'Team team_nonexistent not found',
      );
    });
  });

  describe('importTeam', () => {
    it('imports all entities into the target team', () => {
      const exported = service.exportTeam(sourceTeamId);
      const result = service.importTeam(exported, targetTeamId);

      expect(result.agents).toBe(1);
      expect(result.projects).toBe(1);
      expect(result.tasks).toBe(2);
      expect(result.goals).toBe(1);
      expect(result.routines).toBe(1);
    });

    it('imported agents exist in target team', () => {
      const targetAgents = database.db.select()
        .from(agents)
        .where(eq(agents.teamId, targetTeamId))
        .all();
      expect(targetAgents.length).toBe(1);
      expect(targetAgents[0].name).toBe('Coder');
      expect(targetAgents[0].status).toBe('idle');
    });

    it('imported projects exist in target team', () => {
      const targetProjects = database.db.select()
        .from(projects)
        .where(eq(projects.teamId, targetTeamId))
        .all();
      expect(targetProjects.length).toBe(1);
      expect(targetProjects[0].name).toBe('Main Project');
    });

    it('imported tasks exist in target team', () => {
      const targetTasks = database.db.select()
        .from(tasks)
        .where(eq(tasks.teamId, targetTeamId))
        .all();
      expect(targetTasks.length).toBe(2);
    });

    it('imported goals exist in target team', () => {
      const targetGoals = database.db.select()
        .from(goals)
        .where(eq(goals.teamId, targetTeamId))
        .all();
      expect(targetGoals.length).toBe(1);
      expect(targetGoals[0].title).toBe('Launch v1');
    });

    it('throws for non-existent target team', () => {
      const exported = service.exportTeam(sourceTeamId);
      expect(() => service.importTeam(exported, 'team_ghost')).toThrow(
        'Target team team_ghost not found',
      );
    });
  });
});
