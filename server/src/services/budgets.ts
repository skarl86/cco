import { eq, and, sum } from 'drizzle-orm';
import { budgetPolicies, agents, costEvents } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

export interface BudgetCheck {
  readonly allowed: boolean;
  readonly warningThreshold: boolean;
  readonly reason?: string;
  readonly spentCents: number;
  readonly budgetCents: number;
}

export interface CostSummary {
  readonly totalCostCents: number;
  readonly budgetCents: number;
  readonly spentPercent: number;
}

export function createBudgetService(database: Database) {
  const { db } = database;

  return {
    createPolicy(data: {
      teamId: string;
      scopeType: string;
      scopeId: string;
      windowKind: string;
      amountCents: number;
      warnPercent?: number;
      hardStopEnabled?: boolean;
    }) {
      const now = Date.now();
      const id = generateId('bp');
      const row = {
        id,
        teamId: data.teamId,
        scopeType: data.scopeType,
        scopeId: data.scopeId,
        windowKind: data.windowKind,
        amountCents: data.amountCents,
        warnPercent: data.warnPercent ?? 80,
        hardStopEnabled: data.hardStopEnabled !== false ? 1 : 0,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(budgetPolicies).values(row).run();
      return row;
    },

    listPolicies(teamId: string) {
      return db.select().from(budgetPolicies).where(eq(budgetPolicies.teamId, teamId)).all();
    },

    checkBudget(teamId: string, agentId: string): BudgetCheck {
      const agent = db.select().from(agents).where(
        and(eq(agents.teamId, teamId), eq(agents.id, agentId)),
      ).get();

      if (!agent) {
        return { allowed: false, warningThreshold: false, reason: 'Agent not found', spentCents: 0, budgetCents: 0 };
      }

      const budgetCents = agent.budgetMonthlyCents;
      const spentCents = agent.spentMonthlyCents;

      // No budget set means unlimited
      if (budgetCents <= 0) {
        return { allowed: true, warningThreshold: false, spentCents, budgetCents };
      }

      // Check hard-stop policies
      const policies = db.select().from(budgetPolicies).where(
        and(
          eq(budgetPolicies.teamId, teamId),
          eq(budgetPolicies.scopeType, 'agent'),
          eq(budgetPolicies.scopeId, agentId),
          eq(budgetPolicies.isActive, 1),
        ),
      ).all();

      const hardStopPolicy = policies.find((p) => p.hardStopEnabled === 1);
      const effectiveBudget = hardStopPolicy ? hardStopPolicy.amountCents : budgetCents;

      const warningThreshold = spentCents >= Math.floor(effectiveBudget * 0.8);
      const exceeded = spentCents >= effectiveBudget;

      if (exceeded && hardStopPolicy) {
        return {
          allowed: false,
          warningThreshold: true,
          reason: `Agent budget exceeded: ${spentCents} / ${effectiveBudget} cents`,
          spentCents,
          budgetCents: effectiveBudget,
        };
      }

      return {
        allowed: true,
        warningThreshold,
        spentCents,
        budgetCents: effectiveBudget,
      };
    },

    getCostSummary(teamId: string, agentId: string): CostSummary {
      const agent = db.select().from(agents).where(
        and(eq(agents.teamId, teamId), eq(agents.id, agentId)),
      ).get();

      if (!agent) {
        return { totalCostCents: 0, budgetCents: 0, spentPercent: 0 };
      }

      const budgetCents = agent.budgetMonthlyCents;
      const totalCostCents = agent.spentMonthlyCents;
      const spentPercent = budgetCents > 0 ? Math.round((totalCostCents / budgetCents) * 100) : 0;

      return { totalCostCents, budgetCents, spentPercent };
    },
  };
}
