import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase, type Database, agents, tasks } from '@cco/db';
import { createTeamsService } from './teams.js';

describe('TeamsService', () => {
  let database: Database;
  let service: ReturnType<typeof createTeamsService>;

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createTeamsService(database);
  });

  afterAll(() => database.close());

  it('list() returns empty initially', () => {
    const result = service.list();
    expect(result).toEqual([]);
  });

  it('create() returns team with generated ID', () => {
    const team = service.create({ name: 'Alpha Team' });
    expect(team.id).toBeDefined();
    expect(team.id).toMatch(/^team_/);
    expect(team.name).toBe('Alpha Team');
    expect(team.status).toBe('active');
    expect(team.taskPrefix).toBe('CCO');
    expect(team.taskCounter).toBe(0);
    expect(team.createdAt).toBeDefined();
  });

  it('create() accepts optional fields', () => {
    const team = service.create({
      name: 'Beta Team',
      description: 'A beta team',
      taskPrefix: 'BT',
    });
    expect(team.name).toBe('Beta Team');
    expect(team.description).toBe('A beta team');
    expect(team.taskPrefix).toBe('BT');
  });

  it('getById() returns team', () => {
    const created = service.create({ name: 'Findable Team' });
    const found = service.getById(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Findable Team');
    expect(found!.id).toBe(created.id);
  });

  it('getById() returns undefined for non-existent', () => {
    const found = service.getById('team_nonexistent');
    expect(found).toBeUndefined();
  });

  it('update() changes fields', () => {
    const created = service.create({ name: 'Original Name' });
    const updated = service.update(created.id, {
      name: 'Updated Name',
      description: 'Now with description',
      status: 'archived',
    });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.description).toBe('Now with description');
    expect(updated!.status).toBe('archived');
  });

  it('list() returns all created teams', () => {
    const result = service.list();
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('remove() cascade deletes all related data', () => {
    const team = service.create({ name: 'Doomed Team', taskPrefix: 'DM' });
    const now = Date.now();

    // Create an agent under this team
    database.db.insert(agents).values({
      id: 'agent_doomed_1', teamId: team.id, name: 'Doomed Agent',
      role: 'general', status: 'idle', adapterType: 'claude_code',
      adapterConfig: '{}', budgetMonthlyCents: 0, spentMonthlyCents: 0,
      permissions: '{}', createdAt: now, updatedAt: now,
    }).run();

    // Create a task under this team
    database.db.insert(tasks).values({
      id: 'task_doomed_1', teamId: team.id, title: 'Doomed Task',
      status: 'open', taskNumber: 1, priority: 'medium',
      createdAt: now, updatedAt: now,
    }).run();

    // Verify they exist
    expect(service.getById(team.id)).toBeDefined();

    // Remove the team
    service.remove(team.id);

    // Team should be gone
    expect(service.getById(team.id)).toBeUndefined();

    // Verify cascaded deletes
    const remainingAgents = database.db
      .select()
      .from(agents)
      .where(eq(agents.teamId, team.id))
      .all();
    expect(remainingAgents).toEqual([]);

    const remainingTasks = database.db
      .select()
      .from(tasks)
      .where(eq(tasks.teamId, team.id))
      .all();
    expect(remainingTasks).toEqual([]);
  });
});
