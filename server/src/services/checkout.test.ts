import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, agents } from '@cco/db';
import { createTasksService } from './tasks.js';
import { createCheckoutService } from './checkout.js';

describe('CheckoutService', () => {
  let database: Database;
  let tasksService: ReturnType<typeof createTasksService>;
  let checkoutService: ReturnType<typeof createCheckoutService>;
  const teamId = 'team_co';

  beforeAll(() => {
    database = createDatabase(':memory:');
    tasksService = createTasksService(database);
    checkoutService = createCheckoutService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Checkout Team', status: 'active',
      taskPrefix: 'CO', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: 'agent_a', teamId, name: 'Agent A', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: 'agent_b', teamId, name: 'Agent B', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('checks out a task to an agent', () => {
    const task = tasksService.create(teamId, { title: 'Checkout task' });
    tasksService.update(teamId, task.id, { status: 'todo' });

    const result = checkoutService.checkout(teamId, task.id, 'agent_a', 'run_1');
    expect(result.success).toBe(true);

    const updated = tasksService.getById(teamId, task.id);
    expect(updated!.assigneeAgentId).toBe('agent_a');
    expect(updated!.checkoutRunId).toBe('run_1');
    expect(updated!.status).toBe('in_progress');
  });

  it('prevents double checkout', () => {
    const task = tasksService.create(teamId, { title: 'Double checkout' });
    tasksService.update(teamId, task.id, { status: 'todo' });

    checkoutService.checkout(teamId, task.id, 'agent_a', 'run_2');
    const result = checkoutService.checkout(teamId, task.id, 'agent_b', 'run_3');
    expect(result.success).toBe(false);
    expect(result.error).toBe('status_not_eligible');
  });

  it('releases checkout on completion', () => {
    const task = tasksService.create(teamId, { title: 'Release task' });
    tasksService.update(teamId, task.id, { status: 'todo' });
    checkoutService.checkout(teamId, task.id, 'agent_a', 'run_4');

    checkoutService.release(teamId, task.id, 'in_review');

    const updated = tasksService.getById(teamId, task.id);
    expect(updated!.checkoutRunId).toBeNull();
    expect(updated!.executionLockedAt).toBeNull();
    expect(updated!.status).toBe('in_review');
  });

  it('allows checkout after release', () => {
    const task = tasksService.create(teamId, { title: 'Re-checkout' });
    tasksService.update(teamId, task.id, { status: 'todo' });
    checkoutService.checkout(teamId, task.id, 'agent_a', 'run_5');
    checkoutService.release(teamId, task.id, 'todo');

    const result = checkoutService.checkout(teamId, task.id, 'agent_b', 'run_6');
    expect(result.success).toBe(true);
  });

  it('picks next available todo task for agent', () => {
    const t1 = tasksService.create(teamId, { title: 'Pick 1' });
    tasksService.update(teamId, t1.id, { status: 'todo' });
    const t2 = tasksService.create(teamId, { title: 'Pick 2' });
    tasksService.update(teamId, t2.id, { status: 'todo' });

    const picked = checkoutService.pickNextTask(teamId, 'agent_a');
    expect(picked).toBeDefined();
    expect(picked!.status).toBe('todo');
  });
});
