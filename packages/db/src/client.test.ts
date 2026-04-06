import { describe, it, expect, afterEach } from 'vitest';
import { createDatabase, type Database } from './client.js';
import { teams, agents, tasks, runs, costEvents } from './schema/index.js';
import { eq } from 'drizzle-orm';

describe('Database client', () => {
  let db: Database;

  afterEach(() => {
    db?.close();
  });

  it('creates an in-memory database', () => {
    db = createDatabase(':memory:');
    expect(db).toBeDefined();
    expect(db.db).toBeDefined();
  });

  it('runs migrations and creates tables', () => {
    db = createDatabase(':memory:');
    // Should not throw — tables exist
    const result = db.db.select().from(teams).all();
    expect(result).toEqual([]);
  });
});

describe('Teams CRUD', () => {
  let db: Database;

  afterEach(() => {
    db?.close();
  });

  it('inserts and retrieves a team', () => {
    db = createDatabase(':memory:');
    const now = Date.now();

    db.db.insert(teams).values({
      id: 'team_1',
      name: 'Test Team',
      description: 'A test team',
      status: 'active',
      taskPrefix: 'CCO',
      taskCounter: 0,
      createdAt: now,
      updatedAt: now,
    }).run();

    const result = db.db.select().from(teams).where(eq(teams.id, 'team_1')).get();
    expect(result).toBeDefined();
    expect(result!.name).toBe('Test Team');
    expect(result!.status).toBe('active');
    expect(result!.taskPrefix).toBe('CCO');
  });
});

describe('Agents CRUD', () => {
  let db: Database;

  afterEach(() => {
    db?.close();
  });

  it('inserts and retrieves an agent', () => {
    db = createDatabase(':memory:');
    const now = Date.now();

    db.db.insert(teams).values({
      id: 'team_1',
      name: 'Test',
      status: 'active',
      taskPrefix: 'CCO',
      taskCounter: 0,
      createdAt: now,
      updatedAt: now,
    }).run();

    db.db.insert(agents).values({
      id: 'agent_1',
      teamId: 'team_1',
      name: 'Architect',
      role: 'architect',
      status: 'idle',
      adapterType: 'claude_code',
      adapterConfig: '{}',
      budgetMonthlyCents: 5000,
      spentMonthlyCents: 0,
      permissions: '{}',
      createdAt: now,
      updatedAt: now,
    }).run();

    const result = db.db.select().from(agents).where(eq(agents.id, 'agent_1')).get();
    expect(result).toBeDefined();
    expect(result!.name).toBe('Architect');
    expect(result!.role).toBe('architect');
    expect(result!.budgetMonthlyCents).toBe(5000);
  });
});

describe('Tasks CRUD', () => {
  let db: Database;

  afterEach(() => {
    db?.close();
  });

  it('inserts and retrieves a task with all fields', () => {
    db = createDatabase(':memory:');
    const now = Date.now();

    db.db.insert(teams).values({
      id: 'team_1', name: 'Test', status: 'active',
      taskPrefix: 'CCO', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    db.db.insert(tasks).values({
      id: 'task_1',
      teamId: 'team_1',
      title: 'Fix bug',
      description: 'Login is broken',
      status: 'backlog',
      priority: 'high',
      taskNumber: 1,
      identifier: 'CCO-1',
      originKind: 'manual',
      createdAt: now,
      updatedAt: now,
    }).run();

    const result = db.db.select().from(tasks).where(eq(tasks.id, 'task_1')).get();
    expect(result).toBeDefined();
    expect(result!.title).toBe('Fix bug');
    expect(result!.priority).toBe('high');
    expect(result!.identifier).toBe('CCO-1');
  });
});

describe('Runs + CostEvents', () => {
  let db: Database;

  afterEach(() => {
    db?.close();
  });

  it('inserts a run and cost event', () => {
    db = createDatabase(':memory:');
    const now = Date.now();

    db.db.insert(teams).values({
      id: 'team_1', name: 'Test', status: 'active',
      taskPrefix: 'CCO', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    db.db.insert(agents).values({
      id: 'agent_1', teamId: 'team_1', name: 'Dev', role: 'developer',
      status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();

    db.db.insert(runs).values({
      id: 'run_1', teamId: 'team_1', agentId: 'agent_1',
      invocationSource: 'on_demand', status: 'completed',
      startedAt: now, finishedAt: now + 5000,
      exitCode: 0, createdAt: now, updatedAt: now,
    }).run();

    db.db.insert(costEvents).values({
      id: 'cost_1', teamId: 'team_1', agentId: 'agent_1', runId: 'run_1',
      provider: 'anthropic', model: 'claude-sonnet-4-6',
      billingType: 'api', inputTokens: 1000, cachedInputTokens: 200,
      outputTokens: 500, costCents: 3, occurredAt: now, createdAt: now,
    }).run();

    const result = db.db.select().from(costEvents).where(eq(costEvents.runId, 'run_1')).get();
    expect(result).toBeDefined();
    expect(result!.inputTokens).toBe(1000);
    expect(result!.costCents).toBe(3);
  });
});
