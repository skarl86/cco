import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, agents } from '@cco/db';
import { createRoutinesService } from './routines.js';
import { createTasksService } from './tasks.js';

describe('RoutinesService', () => {
  let database: Database;
  let service: ReturnType<typeof createRoutinesService>;
  const teamId = 'team_routine';

  beforeAll(() => {
    database = createDatabase(':memory:');
    const tasksService = createTasksService(database);
    service = createRoutinesService(database, tasksService);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Routine Team', status: 'active',
      taskPrefix: 'RT', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: 'agent_routine', teamId, name: 'Routine Agent', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a routine', () => {
    const routine = service.create({
      teamId,
      title: 'Daily cleanup',
      description: 'Clean up temp files',
      assigneeAgentId: 'agent_routine',
      cronExpression: '0 0 * * *',
    });
    expect(routine.id).toBeDefined();
    expect(routine.title).toBe('Daily cleanup');
    expect(routine.status).toBe('active');
    expect(routine.cronExpression).toBe('0 0 * * *');
  });

  it('lists routines', () => {
    const list = service.list(teamId);
    expect(list.length).toBe(1);
  });

  it('updates a routine', () => {
    const routine = service.create({
      teamId,
      title: 'Update test',
      assigneeAgentId: 'agent_routine',
      cronExpression: '*/5 * * * *',
    });
    const updated = service.update(teamId, routine.id, { status: 'paused' });
    expect(updated!.status).toBe('paused');
  });

  it('triggers a routine and creates a task', () => {
    const routine = service.create({
      teamId,
      title: 'Trigger test routine',
      assigneeAgentId: 'agent_routine',
      cronExpression: '0 * * * *',
    });

    const task = service.trigger(teamId, routine.id);
    expect(task).toBeDefined();
    expect(task!.title).toContain('Trigger test routine');
    expect(task!.originKind).toBe('routine');
    expect(task!.assigneeAgentId).toBe('agent_routine');
  });

  it('trigger updates lastTriggeredAt', () => {
    const list = service.list(teamId);
    const triggered = list.find((r: any) => r.title === 'Trigger test routine');
    expect(triggered!.lastTriggeredAt).toBeDefined();
    expect(triggered!.lastTriggeredAt).toBeGreaterThan(0);
  });

  it('skips trigger for paused routine', () => {
    const routine = service.create({
      teamId,
      title: 'Paused routine',
      assigneeAgentId: 'agent_routine',
      cronExpression: '0 * * * *',
    });
    service.update(teamId, routine.id, { status: 'paused' });
    const task = service.trigger(teamId, routine.id);
    expect(task).toBeNull();
  });
});
