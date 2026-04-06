import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams } from '@cco/db';
import { createTasksService } from './tasks.js';

describe('TasksService', () => {
  let database: Database;
  let service: ReturnType<typeof createTasksService>;
  const teamId = 'team_task';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createTasksService(database);
    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'Task Team', status: 'active',
      taskPrefix: 'TSK', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a task with auto-numbering', () => {
    const task = service.create(teamId, { title: 'First task' });
    expect(task.title).toBe('First task');
    expect(task.taskNumber).toBe(1);
    expect(task.identifier).toBe('TSK-1');
    expect(task.status).toBe('backlog');
    expect(task.priority).toBe('medium');
  });

  it('increments task numbers', () => {
    const t2 = service.create(teamId, { title: 'Second task' });
    const t3 = service.create(teamId, { title: 'Third task' });
    expect(t2.taskNumber).toBe(2);
    expect(t3.taskNumber).toBe(3);
    expect(t2.identifier).toBe('TSK-2');
  });

  it('lists tasks by team', () => {
    const list = service.list(teamId);
    expect(list.length).toBeGreaterThanOrEqual(3);
  });

  it('lists tasks filtered by status', () => {
    const list = service.list(teamId, { status: 'backlog' });
    expect(list.length).toBeGreaterThanOrEqual(3);
    const doneList = service.list(teamId, { status: 'done' });
    expect(doneList.length).toBe(0);
  });

  it('gets a task by id', () => {
    const created = service.create(teamId, { title: 'Get me' });
    const found = service.getById(teamId, created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Get me');
  });

  it('validates status transitions', () => {
    const task = service.create(teamId, { title: 'Transition test' });

    // backlog -> todo: valid
    const updated = service.update(teamId, task.id, { status: 'todo' });
    expect(updated!.status).toBe('todo');

    // todo -> in_progress: valid
    const updated2 = service.update(teamId, task.id, { status: 'in_progress' });
    expect(updated2!.status).toBe('in_progress');

    // in_progress -> backlog: invalid
    expect(() => service.update(teamId, task.id, { status: 'backlog' })).toThrow();
  });

  it('supports parent-child tasks', () => {
    const parent = service.create(teamId, { title: 'Parent task' });
    const child = service.create(teamId, { title: 'Child task', parentId: parent.id });
    expect(child.parentId).toBe(parent.id);

    const children = service.listChildren(teamId, parent.id);
    expect(children.length).toBe(1);
    expect(children[0].title).toBe('Child task');
  });

  it('creates with priority', () => {
    const task = service.create(teamId, { title: 'Urgent', priority: 'urgent' });
    expect(task.priority).toBe('urgent');
  });

  it('sets startedAt when moving to in_progress', () => {
    const task = service.create(teamId, { title: 'Start track' });
    service.update(teamId, task.id, { status: 'todo' });
    const updated = service.update(teamId, task.id, { status: 'in_progress' });
    expect(updated!.startedAt).toBeDefined();
    expect(updated!.startedAt).toBeGreaterThan(0);
  });

  it('sets completedAt when moving to done', () => {
    const task = service.create(teamId, { title: 'Complete track' });
    service.update(teamId, task.id, { status: 'todo' });
    service.update(teamId, task.id, { status: 'in_progress' });
    service.update(teamId, task.id, { status: 'in_review' });
    const done = service.update(teamId, task.id, { status: 'done' });
    expect(done!.completedAt).toBeDefined();
    expect(done!.completedAt).toBeGreaterThan(0);
  });
});
