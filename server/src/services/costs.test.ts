import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, agents, costEvents } from '@cco/db';
import { createCostsService } from './costs.js';

describe('CostsService', () => {
  let database: Database;
  let service: ReturnType<typeof createCostsService>;
  const teamId = 'team_costs';
  const agentId1 = 'agent_costs_1';
  const agentId2 = 'agent_costs_2';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createCostsService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Costs Team', status: 'active',
      taskPrefix: 'CT', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: agentId1, teamId, name: 'Agent One', role: 'general',
      status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: agentId2, teamId, name: 'Agent Two', role: 'general',
      status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('list() returns empty for team with no costs', () => {
    const result = service.list('team_nonexistent');
    expect(result).toEqual([]);
  });

  it('list() returns cost events after inserting some', () => {
    const now = Date.now();
    database.db.insert(costEvents).values({
      id: 'ce_1', teamId, agentId: agentId1, provider: 'anthropic',
      model: 'claude-4', billingType: 'subscription',
      inputTokens: 100, cachedInputTokens: 0, outputTokens: 50,
      costCents: 10, occurredAt: now, createdAt: now,
    }).run();

    database.db.insert(costEvents).values({
      id: 'ce_2', teamId, agentId: agentId2, provider: 'anthropic',
      model: 'claude-4', billingType: 'subscription',
      inputTokens: 200, cachedInputTokens: 0, outputTokens: 100,
      costCents: 20, occurredAt: now - 1000, createdAt: now,
    }).run();

    const result = service.list(teamId);
    expect(result.length).toBe(2);
    // Ordered by occurredAt desc
    expect(result[0].id).toBe('ce_1');
    expect(result[1].id).toBe('ce_2');
  });

  it('list() filters by agentId', () => {
    const result = service.list(teamId, { agentId: agentId1 });
    expect(result.length).toBe(1);
    expect(result[0].agentId).toBe(agentId1);
  });

  it('getMonthlySpend() returns 0 for empty team', () => {
    const result = service.getMonthlySpend('team_nonexistent');
    expect(result.totalCents).toBe(0);
  });

  it('getMonthlySpend() returns sum of cost_cents for current month', () => {
    // Both ce_1 and ce_2 were inserted with timestamps within this month
    const result = service.getMonthlySpend(teamId);
    expect(result.totalCents).toBe(30);
  });

  it('getSpendByAgent() returns per-agent breakdown', () => {
    const result = service.getSpendByAgent(teamId);
    expect(result.length).toBe(2);

    const agent1Row = result.find((r) => r.agentId === agentId1);
    const agent2Row = result.find((r) => r.agentId === agentId2);

    expect(agent1Row).toBeDefined();
    expect(agent1Row!.totalCents).toBe(10);
    expect(agent1Row!.totalInputTokens).toBe(100);
    expect(agent1Row!.totalOutputTokens).toBe(50);

    expect(agent2Row).toBeDefined();
    expect(agent2Row!.totalCents).toBe(20);
    expect(agent2Row!.totalInputTokens).toBe(200);
    expect(agent2Row!.totalOutputTokens).toBe(100);
  });
});
