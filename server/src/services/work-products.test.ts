import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, tasks, workProducts } from '@cco/db';
import { eq } from 'drizzle-orm';
import { createWorkProductsService } from './work-products.js';

describe('WorkProductsService', () => {
  let database: Database;
  let service: ReturnType<typeof createWorkProductsService>;
  const teamId = 'team_wp_test';
  const taskId = 'task_wp_test';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createWorkProductsService(database);
    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'WP Team', status: 'active',
      taskPrefix: 'WP', taskCounter: 1, createdAt: now, updatedAt: now,
    }).run();
    database.db.insert(tasks).values({
      id: taskId, teamId, title: 'Test task', status: 'todo',
      priority: 'medium', originKind: 'manual', requestDepth: 0,
      taskNumber: 1, identifier: 'WP-1',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('list returns empty for task with no work products', () => {
    const result = service.list(teamId, taskId);
    expect(result).toEqual([]);
  });

  it('create returns work product with generated id', () => {
    const wp = service.create(teamId, {
      taskId,
      type: 'pull_request',
      provider: 'github',
      title: 'feat: add auth',
    });
    expect(wp.id).toMatch(/^wp_/);
    expect(wp.teamId).toBe(teamId);
    expect(wp.taskId).toBe(taskId);
    expect(wp.type).toBe('pull_request');
    expect(wp.provider).toBe('github');
    expect(wp.title).toBe('feat: add auth');
    expect(wp.status).toBe('active');
    expect(wp.reviewState).toBe('none');
    expect(wp.isPrimary).toBe(0);
    expect(wp.healthStatus).toBe('unknown');
  });

  it('create sets isPrimary correctly', () => {
    const wp = service.create(teamId, {
      taskId,
      type: 'branch',
      provider: 'github',
      title: 'feature/auth',
      isPrimary: true,
    });
    expect(wp.isPrimary).toBe(1);
  });

  it('creating primary demotes existing primary of same type', () => {
    const first = service.create(teamId, {
      taskId,
      type: 'commit',
      provider: 'github',
      title: 'commit abc',
      isPrimary: true,
    });
    expect(first.isPrimary).toBe(1);

    const second = service.create(teamId, {
      taskId,
      type: 'commit',
      provider: 'github',
      title: 'commit def',
      isPrimary: true,
    });
    expect(second.isPrimary).toBe(1);

    const refreshedFirst = service.getById(teamId, first.id);
    expect(refreshedFirst!.isPrimary).toBe(0);
  });

  it('list returns primary first, then by updatedAt desc', () => {
    // Create a fresh task for isolation
    const freshTaskId = 'task_wp_order';
    const now = Date.now();
    database.db.insert(tasks).values({
      id: freshTaskId, teamId, title: 'Order task', status: 'todo',
      priority: 'medium', originKind: 'manual', requestDepth: 0,
      taskNumber: 2, identifier: 'WP-2',
      createdAt: now, updatedAt: now,
    }).run();

    const a = service.create(teamId, {
      taskId: freshTaskId, type: 'artifact', provider: 'local',
      title: 'Artifact A', isPrimary: false,
    });
    // Manually set distinct updatedAt so ordering is deterministic
    database.db.update(workProducts).set({ updatedAt: 1000 }).where(eq(workProducts.id, a.id)).run();

    const b = service.create(teamId, {
      taskId: freshTaskId, type: 'artifact', provider: 'local',
      title: 'Artifact B', isPrimary: true,
    });
    database.db.update(workProducts).set({ updatedAt: 2000 }).where(eq(workProducts.id, b.id)).run();

    const c = service.create(teamId, {
      taskId: freshTaskId, type: 'artifact', provider: 'local',
      title: 'Artifact C', isPrimary: false,
    });
    database.db.update(workProducts).set({ updatedAt: 3000 }).where(eq(workProducts.id, c.id)).run();

    const list = service.list(teamId, freshTaskId);
    expect(list.length).toBe(3);
    // Primary (B) should be first
    expect(list[0].id).toBe(b.id);
    // Then C (newer updatedAt=3000) before A (older updatedAt=1000)
    expect(list[1].id).toBe(c.id);
    expect(list[2].id).toBe(a.id);
  });

  it('getById returns work product', () => {
    const wp = service.create(teamId, {
      taskId, type: 'document', provider: 'local', title: 'README',
    });
    const found = service.getById(teamId, wp.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('README');
  });

  it('getById returns undefined for non-existent', () => {
    const found = service.getById(teamId, 'wp_nonexistent');
    expect(found).toBeUndefined();
  });

  it('update changes fields', () => {
    const wp = service.create(teamId, {
      taskId, type: 'pull_request', provider: 'github', title: 'Original',
    });
    const updated = service.update(teamId, wp.id, {
      title: 'Updated PR',
      status: 'merged',
      reviewState: 'approved',
    });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated PR');
    expect(updated!.status).toBe('merged');
    expect(updated!.reviewState).toBe('approved');
  });

  it('update to isPrimary demotes siblings', () => {
    const freshTaskId = 'task_wp_primary_update';
    const now = Date.now();
    database.db.insert(tasks).values({
      id: freshTaskId, teamId, title: 'Primary update task', status: 'todo',
      priority: 'medium', originKind: 'manual', requestDepth: 0,
      taskNumber: 3, identifier: 'WP-3',
      createdAt: now, updatedAt: now,
    }).run();

    const first = service.create(teamId, {
      taskId: freshTaskId, type: 'pull_request', provider: 'github',
      title: 'PR 1', isPrimary: true,
    });
    const second = service.create(teamId, {
      taskId: freshTaskId, type: 'pull_request', provider: 'github',
      title: 'PR 2', isPrimary: false,
    });

    service.update(teamId, second.id, { isPrimary: true });

    const refreshedFirst = service.getById(teamId, first.id);
    expect(refreshedFirst!.isPrimary).toBe(0);
    const refreshedSecond = service.getById(teamId, second.id);
    expect(refreshedSecond!.isPrimary).toBe(1);
  });

  it('remove deletes work product', () => {
    const wp = service.create(teamId, {
      taskId, type: 'artifact', provider: 'local', title: 'To delete',
    });
    const removed = service.remove(teamId, wp.id);
    expect(removed).toBeDefined();
    expect(removed!.id).toBe(wp.id);

    const after = service.getById(teamId, wp.id);
    expect(after).toBeUndefined();
  });

  it('remove returns undefined for non-existent', () => {
    const result = service.remove(teamId, 'wp_nonexistent');
    expect(result).toBeUndefined();
  });

  it('list filters by type', () => {
    const freshTaskId = 'task_wp_filter';
    const now = Date.now();
    database.db.insert(tasks).values({
      id: freshTaskId, teamId, title: 'Filter task', status: 'todo',
      priority: 'medium', originKind: 'manual', requestDepth: 0,
      taskNumber: 4, identifier: 'WP-4',
      createdAt: now, updatedAt: now,
    }).run();

    service.create(teamId, {
      taskId: freshTaskId, type: 'pull_request', provider: 'github', title: 'PR',
    });
    service.create(teamId, {
      taskId: freshTaskId, type: 'branch', provider: 'github', title: 'Branch',
    });
    service.create(teamId, {
      taskId: freshTaskId, type: 'pull_request', provider: 'github', title: 'PR 2',
    });

    const prs = service.list(teamId, freshTaskId, 'pull_request');
    expect(prs.length).toBe(2);
    for (const wp of prs) {
      expect(wp.type).toBe('pull_request');
    }
  });
});
