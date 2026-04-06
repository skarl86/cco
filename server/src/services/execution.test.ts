import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createDatabase, type Database, teams, agents } from '@cco/db';
import { createExecutionService, type ExecutionService } from './execution.js';
import { AdapterRegistry } from '../adapters/registry.js';
import type { ServerAdapterModule, AdapterExecutionContext, AdapterExecutionResult } from '@cco/adapter-utils';

function createMockAdapter(): ServerAdapterModule {
  return {
    type: 'mock',
    async execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
      await ctx.onLog('stdout', 'mock output');
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        usage: { inputTokens: 100, outputTokens: 50, cachedInputTokens: 10 },
        sessionId: 'mock-session',
        provider: 'mock',
        model: 'mock-model',
        billingType: 'api',
        costUsd: 0.001,
        summary: 'Mock completed successfully',
      };
    },
    async testEnvironment() {
      return { ok: true };
    },
  };
}

describe('ExecutionService', () => {
  let database: Database;
  let service: ExecutionService;
  let teamId: string;
  let agentId: string;

  beforeAll(() => {
    database = createDatabase(':memory:');
    const registry = new AdapterRegistry();
    registry.register(createMockAdapter());
    service = createExecutionService(database, registry);

    const now = Date.now();
    teamId = 'team_exec';
    agentId = 'agent_exec';

    database.db.insert(teams).values({
      id: teamId, name: 'Exec Team', status: 'active',
      taskPrefix: 'CCO', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: agentId, teamId, name: 'Mock Agent', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 10000, spentMonthlyCents: 0,
      permissions: '{}', createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => {
    database.close();
  });

  it('starts a run and records result', async () => {
    const result = await service.startRun({
      teamId,
      agentId,
      prompt: 'Hello, test!',
      invocationSource: 'on_demand',
    });

    expect(result.status).toBe('completed');
    expect(result.exitCode).toBe(0);
    expect(result.usage).toBeDefined();
    expect(result.usage?.inputTokens).toBe(100);
  });

  it('creates a run record in the database', async () => {
    const result = await service.startRun({
      teamId,
      agentId,
      prompt: 'DB test',
      invocationSource: 'on_demand',
    });

    const run = service.getRunById(result.runId);
    expect(run).toBeDefined();
    expect(run!.status).toBe('completed');
    expect(run!.agentId).toBe(agentId);
  });

  it('creates a cost event for completed runs', async () => {
    const result = await service.startRun({
      teamId,
      agentId,
      prompt: 'Cost test',
      invocationSource: 'on_demand',
    });

    const costs = service.getCostsByRunId(result.runId);
    expect(costs.length).toBe(1);
    expect(costs[0].provider).toBe('mock');
    expect(costs[0].inputTokens).toBe(100);
  });

  it('fails gracefully for unknown adapter', async () => {
    const now = Date.now();
    database.db.insert(agents).values({
      id: 'agent_bad', teamId, name: 'Bad Agent', role: 'developer',
      status: 'idle', adapterType: 'nonexistent', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0,
      permissions: '{}', createdAt: now, updatedAt: now,
    }).run();

    const result = await service.startRun({
      teamId,
      agentId: 'agent_bad',
      prompt: 'Should fail',
      invocationSource: 'on_demand',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('nonexistent');
  });

  it('lists runs for an agent', async () => {
    const runs = service.listRuns(teamId, agentId);
    expect(runs.length).toBeGreaterThanOrEqual(3);
  });
});
