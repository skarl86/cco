import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, tasks } from '@cco/db';
import { createCommentsService } from './comments.js';

describe('CommentsService', () => {
  let database: Database;
  let service: ReturnType<typeof createCommentsService>;
  const teamId = 'team_cmt';
  const taskId = 'task_cmt';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createCommentsService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Comment Team', status: 'active',
      taskPrefix: 'CM', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(tasks).values({
      id: taskId, teamId, title: 'Commentable task',
      status: 'in_progress', priority: 'medium', originKind: 'manual',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a user comment', () => {
    const comment = service.create({
      teamId,
      taskId,
      authorType: 'user',
      body: 'Please fix this ASAP',
    });
    expect(comment.id).toBeDefined();
    expect(comment.body).toBe('Please fix this ASAP');
    expect(comment.authorType).toBe('user');
  });

  it('creates an agent comment', () => {
    const comment = service.create({
      teamId,
      taskId,
      authorAgentId: 'agent_1',
      authorType: 'agent',
      body: 'I have completed the fix',
    });
    expect(comment.authorAgentId).toBe('agent_1');
  });

  it('lists comments for a task in order', () => {
    const comments = service.listByTask(teamId, taskId);
    expect(comments.length).toBe(2);
    // First comment should be older
    expect(comments[0].createdAt).toBeLessThanOrEqual(comments[1].createdAt);
  });

  it('creates a system comment', () => {
    const comment = service.create({
      teamId,
      taskId,
      authorType: 'system',
      body: 'Task status changed to in_review',
    });
    expect(comment.authorType).toBe('system');
  });
});
