import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase, type Database, teams, agents, costEvents } from '@cco/db';
import { createBudgetService } from './budgets.js';

describe('BudgetService', () => {
  let database: Database;
  let service: ReturnType<typeof createBudgetService>;
  const teamId = 'team_budget';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createBudgetService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Budget Team', status: 'active',
      taskPrefix: 'BT', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: 'agent_budget', teamId, name: 'Budget Agent', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 1000, spentMonthlyCents: 800,
      permissions: '{}', createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a budget policy', () => {
    const policy = service.createPolicy({
      teamId,
      scopeType: 'agent',
      scopeId: 'agent_budget',
      windowKind: 'monthly',
      amountCents: 1000,
      warnPercent: 80,
      hardStopEnabled: true,
    });
    expect(policy.id).toBeDefined();
    expect(policy.amountCents).toBe(1000);
  });

  it('lists policies for a team', () => {
    const policies = service.listPolicies(teamId);
    expect(policies.length).toBeGreaterThanOrEqual(1);
  });

  it('checks budget - allows when under limit', () => {
    // Agent spent 800 of 1000 — under limit
    const check = service.checkBudget(teamId, 'agent_budget');
    expect(check.allowed).toBe(true);
    expect(check.warningThreshold).toBe(true); // 80% = 800, spent 800 = at threshold
  });

  it('checks budget - blocks when over hard-stop', () => {
    // Increase spent to 1100
    const now = Date.now();
    database.db.insert(costEvents).values({
      id: 'cost_over', teamId, agentId: 'agent_budget',
      provider: 'mock', model: 'mock', billingType: 'api',
      inputTokens: 100, cachedInputTokens: 0, outputTokens: 50,
      costCents: 300, occurredAt: now, createdAt: now,
    }).run();

    database.db.update(agents)
      .set({ spentMonthlyCents: 1100 })
      .where(eq(agents.id, 'agent_budget'))
      .run();

    const check = service.checkBudget(teamId, 'agent_budget');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('budget exceeded');
  });

  it('gets cost summary for an agent', () => {
    const summary = service.getCostSummary(teamId, 'agent_budget');
    expect(summary.totalCostCents).toBeGreaterThanOrEqual(0);
    expect(summary.budgetCents).toBe(1000);
  });
});
