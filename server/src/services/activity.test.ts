import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams } from '@cco/db';
import { createActivityService } from './activity.js';

describe('ActivityService', () => {
  let database: Database;
  let service: ReturnType<typeof createActivityService>;
  const teamId = 'team_act';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createActivityService(database);
    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'Activity Team', status: 'active',
      taskPrefix: 'AC', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('logs an activity', () => {
    const entry = service.log({
      teamId,
      actorType: 'user',
      actorId: 'user_1',
      action: 'create',
      entityType: 'agent',
      entityId: 'agent_1',
      detail: { name: 'New Agent' },
    });
    expect(entry.id).toBeDefined();
    expect(entry.action).toBe('create');
  });

  it('lists activities by team', () => {
    service.log({
      teamId, actorType: 'system', action: 'run_completed',
      entityType: 'run', entityId: 'run_1',
    });
    const list = service.list(teamId);
    expect(list.length).toBe(2);
  });

  it('returns newest first', () => {
    const list = service.list(teamId);
    expect(list[0].createdAt).toBeGreaterThanOrEqual(list[1].createdAt);
  });
});
