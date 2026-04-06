import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, projects } from '@cco/db';
import { createGoalsService } from './goals.js';

describe('GoalsService', () => {
  let database: Database;
  let service: ReturnType<typeof createGoalsService>;
  const teamId = 'team_goals';
  const projectId = 'proj_goals_1';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createGoalsService(database);
    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'Goals Team', status: 'active',
      taskPrefix: 'GL', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();
    database.db.insert(projects).values({
      id: projectId, teamId, name: 'Test Project', status: 'active',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a goal', () => {
    const goal = service.create(teamId, { title: 'Ship v1' });
    expect(goal.id).toBeDefined();
    expect(goal.title).toBe('Ship v1');
    expect(goal.status).toBe('active');
    expect(goal.priority).toBe('medium');
    expect(goal.parentId).toBeNull();
    expect(goal.projectId).toBeNull();
  });

  it('creates a goal with projectId', () => {
    const goal = service.create(teamId, {
      title: 'Project goal',
      projectId,
      priority: 'high',
    });
    expect(goal.projectId).toBe(projectId);
    expect(goal.priority).toBe('high');
  });

  it('lists all goals for a team', () => {
    const list = service.list(teamId);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('lists goals filtered by projectId', () => {
    const filtered = service.list(teamId, projectId);
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Project goal');
  });

  it('gets a goal by id', () => {
    const created = service.create(teamId, { title: 'Find me' });
    const found = service.getById(teamId, created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Find me');
  });

  it('returns undefined for non-existent goal', () => {
    const found = service.getById(teamId, 'goal_nonexistent');
    expect(found).toBeUndefined();
  });

  it('updates a goal', () => {
    const created = service.create(teamId, { title: 'Update me' });
    const updated = service.update(teamId, created.id, {
      title: 'Updated title',
      status: 'completed',
      priority: 'high',
    });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated title');
    expect(updated!.status).toBe('completed');
    expect(updated!.priority).toBe('high');
  });

  describe('hierarchy', () => {
    it('creates parent and child goals', () => {
      const parent = service.create(teamId, { title: 'Parent goal' });
      const child1 = service.create(teamId, {
        title: 'Child goal 1',
        parentId: parent.id,
      });
      const child2 = service.create(teamId, {
        title: 'Child goal 2',
        parentId: parent.id,
      });

      expect(child1.parentId).toBe(parent.id);
      expect(child2.parentId).toBe(parent.id);

      const children = service.listChildren(teamId, parent.id);
      expect(children.length).toBe(2);
      const titles = children.map((c) => c.title);
      expect(titles).toContain('Child goal 1');
      expect(titles).toContain('Child goal 2');
    });

    it('returns empty array when parent has no children', () => {
      const parent = service.create(teamId, { title: 'Lonely parent' });
      const children = service.listChildren(teamId, parent.id);
      expect(children.length).toBe(0);
    });
  });
});
