import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase, type Database, teams, agents, tasks } from '@cco/db';
import { createScheduler, type Scheduler } from './scheduler.js';
import { createExecutionService } from './execution.js';
import { createCheckoutService } from './checkout.js';
import { createTasksService } from './tasks.js';
import { AdapterRegistry } from '../adapters/registry.js';
import type { ServerAdapterModule, AdapterExecutionContext, AdapterExecutionResult } from '@cco/adapter-utils';

function createMockAdapter(): ServerAdapterModule {
  return {
    type: 'mock',
    async execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
      await ctx.onLog('stdout', 'heartbeat output');
      return {
        exitCode: 0, signal: null, timedOut: false,
        usage: { inputTokens: 50, outputTokens: 25 },
        sessionId: 'hb-session', provider: 'mock', model: 'mock',
        billingType: 'api', costUsd: 0.0005, summary: 'Done',
      };
    },
    async testEnvironment() { return { ok: true }; },
  };
}

describe('Scheduler', () => {
  let database: Database;
  let scheduler: Scheduler;
  const teamId = 'team_sched';

  beforeAll(() => {
    database = createDatabase(':memory:');
    const registry = new AdapterRegistry();
    registry.register(createMockAdapter());
    const executionService = createExecutionService(database, registry);
    const checkoutService = createCheckoutService(database);
    const tasksService = createTasksService(database);

    scheduler = createScheduler({
      database,
      executionService,
      checkoutService,
      tasksService,
    });

    const now = Date.now();
    database.db.insert(teams).values({
      id: teamId, name: 'Sched Team', status: 'active',
      taskPrefix: 'SC', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: 'agent_sched', teamId, name: 'Sched Agent', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => {
    scheduler.stop();
    database.close();
  });

  it('tick picks up an idle agent with a todo task', async () => {
    // Create a todo task
    const now = Date.now();
    database.db.insert(tasks).values({
      id: 'task_sched1', teamId, title: 'Scheduled task',
      status: 'todo', priority: 'medium', originKind: 'manual',
      taskNumber: 1, identifier: 'SC-1',
      createdAt: now, updatedAt: now,
    }).run();

    const results = await scheduler.tick();
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('completed');
  });

  it('tick skips running agents', async () => {
    // Set agent to running
    const now = Date.now();
    database.db.update(agents)
      .set({ status: 'running', updatedAt: now })
      .where(eq(agents.id, 'agent_sched'))
      .run();

    const results = await scheduler.tick();
    expect(results.length).toBe(0);

    // Reset
    database.db.update(agents)
      .set({ status: 'idle', updatedAt: now })
      .where(eq(agents.id, 'agent_sched'))
      .run();
  });

  it('tick does nothing when no todo tasks', async () => {
    const results = await scheduler.tick();
    expect(results.length).toBe(0);
  });

  it('tick transitions task to done on successful run', async () => {
    const now = Date.now();
    database.db.insert(tasks).values({
      id: 'task_sched_done', teamId, title: 'Done test',
      status: 'todo', priority: 'medium', originKind: 'manual',
      taskNumber: 10, identifier: 'SC-10',
      createdAt: now, updatedAt: now,
    }).run();

    // Reset agent to idle
    database.db.update(agents)
      .set({ status: 'idle', updatedAt: now })
      .where(eq(agents.id, 'agent_sched'))
      .run();

    const results = await scheduler.tick();
    expect(results[0].status).toBe('completed');

    const task = database.db.select().from(tasks)
      .where(eq(tasks.id, 'task_sched_done')).get();
    expect(task!.status).toBe('done');
    expect(task!.completedAt).toBeGreaterThan(0);
    expect(task!.checkoutRunId).toBeNull();
  });

  it('start and stop control the interval timer', () => {
    scheduler.start(10_000);
    // calling start again is a no-op
    scheduler.start(10_000);
    scheduler.stop();
    // stopping again is safe
    scheduler.stop();
  });
});
