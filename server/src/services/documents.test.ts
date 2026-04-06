import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, tasks } from '@cco/db';
import { createDocumentsService } from './documents.js';

describe('DocumentsService', () => {
  let database: Database;
  let service: ReturnType<typeof createDocumentsService>;
  const teamId = 'team_docs';
  const taskId = 'task_docs_1';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createDocumentsService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Docs Team', status: 'active',
      taskPrefix: 'DC', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(tasks).values({
      id: taskId, teamId, title: 'Doc task', status: 'todo',
      priority: 'medium', taskNumber: 1, identifier: 'DC-1',
      originKind: 'manual', createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates first document with version 1', () => {
    const doc = service.create(teamId, {
      taskId,
      title: 'Design Doc',
      content: 'Initial content',
    });
    expect(doc.id).toBeDefined();
    expect(doc.version).toBe(1);
    expect(doc.title).toBe('Design Doc');
    expect(doc.content).toBe('Initial content');
    expect(doc.authorType).toBe('system');
  });

  it('creates second document with version 2', () => {
    const doc = service.create(teamId, {
      taskId,
      title: 'Design Doc v2',
      content: 'Updated content',
      authorType: 'agent',
    });
    expect(doc.version).toBe(2);
    expect(doc.content).toBe('Updated content');
    expect(doc.authorType).toBe('agent');
  });

  it('getLatest returns the highest version', () => {
    const latest = service.getLatest(teamId, taskId);
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(2);
    expect(latest!.content).toBe('Updated content');
  });

  it('getByVersion returns the correct version', () => {
    const v1 = service.getByVersion(teamId, taskId, 1);
    expect(v1).toBeDefined();
    expect(v1!.version).toBe(1);
    expect(v1!.content).toBe('Initial content');

    const v2 = service.getByVersion(teamId, taskId, 2);
    expect(v2).toBeDefined();
    expect(v2!.version).toBe(2);
  });

  it('getByVersion returns undefined for non-existent version', () => {
    const missing = service.getByVersion(teamId, taskId, 999);
    expect(missing).toBeUndefined();
  });

  it('lists documents ordered by version descending', () => {
    const list = service.list(teamId, taskId);
    expect(list.length).toBe(2);
    expect(list[0].version).toBe(2);
    expect(list[1].version).toBe(1);
  });

  it('restore creates a new version with source content', () => {
    const restored = service.restore(teamId, taskId, 1);
    expect(restored).toBeDefined();
    expect(restored!.version).toBe(3);
    expect(restored!.content).toBe('Initial content');
    expect(restored!.title).toBe('Design Doc');

    // Verify getLatest now returns version 3
    const latest = service.getLatest(teamId, taskId);
    expect(latest!.version).toBe(3);
  });

  it('restore returns undefined for non-existent version', () => {
    const result = service.restore(teamId, taskId, 999);
    expect(result).toBeUndefined();
  });
});
