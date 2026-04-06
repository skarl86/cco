import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams } from '@cco/db';
import { createFeedbackService } from './feedback.js';

describe('FeedbackService', () => {
  let database: Database;
  let service: ReturnType<typeof createFeedbackService>;
  const teamId = 'team_fb';
  const targetType = 'run';
  const targetId = 'run_fb_1';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createFeedbackService(database);
    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'Feedback Team', status: 'active',
      taskPrefix: 'FB', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates an up vote', () => {
    const fb = service.create(teamId, {
      targetType,
      targetId,
      vote: 'up',
      reason: 'Great output',
    });
    expect(fb.id).toBeDefined();
    expect(fb.vote).toBe('up');
    expect(fb.reason).toBe('Great output');
    expect(fb.actorType).toBe('user');
  });

  it('creates a down vote', () => {
    const fb = service.create(teamId, {
      targetType,
      targetId,
      vote: 'down',
      reason: 'Needs improvement',
    });
    expect(fb.vote).toBe('down');
    expect(fb.reason).toBe('Needs improvement');
  });

  it('getSummary returns correct counts', () => {
    const summary = service.getSummary(teamId, targetType, targetId);
    expect(summary.up).toBe(1);
    expect(summary.down).toBe(1);
  });

  it('getSummary returns zeros for unknown target', () => {
    const summary = service.getSummary(teamId, 'task', 'task_unknown');
    expect(summary.up).toBe(0);
    expect(summary.down).toBe(0);
  });

  it('lists all feedback for a team', () => {
    const list = service.list(teamId);
    expect(list.length).toBe(2);
  });

  it('lists feedback filtered by vote', () => {
    const upList = service.list(teamId, { vote: 'up' });
    expect(upList.length).toBe(1);
    expect(upList[0].vote).toBe('up');

    const downList = service.list(teamId, { vote: 'down' });
    expect(downList.length).toBe(1);
    expect(downList[0].vote).toBe('down');
  });

  it('lists feedback filtered by target', () => {
    const list = service.list(teamId, { targetType, targetId });
    expect(list.length).toBe(2);

    const empty = service.list(teamId, { targetType: 'task', targetId: 'none' });
    expect(empty.length).toBe(0);
  });

  it('lists feedback with limit', () => {
    const list = service.list(teamId, { limit: 1 });
    expect(list.length).toBe(1);
  });

  it('getByTarget returns feedback for a specific target', () => {
    const list = service.getByTarget(teamId, targetType, targetId);
    expect(list.length).toBe(2);
  });

  it('creates feedback with payload', () => {
    const fb = service.create(teamId, {
      targetType: 'task',
      targetId: 'task_fb_1',
      vote: 'up',
      payload: { extra: 'data' },
    });
    expect(fb.payload).toBe(JSON.stringify({ extra: 'data' }));
  });
});
