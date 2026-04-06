import { sql, eq, and, desc } from 'drizzle-orm';
import { costEvents } from '@cco/db';
import type { Database } from '@cco/db';

export function createCostsService(database: Database) {
  const { db } = database;

  return {
    list(
      teamId: string,
      opts?: { agentId?: string; from?: number; to?: number; limit?: number },
    ) {
      const conditions = [eq(costEvents.teamId, teamId)];

      if (opts?.agentId) {
        conditions.push(eq(costEvents.agentId, opts.agentId));
      }
      if (opts?.from) {
        conditions.push(sql`${costEvents.occurredAt} >= ${opts.from}`);
      }
      if (opts?.to) {
        conditions.push(sql`${costEvents.occurredAt} <= ${opts.to}`);
      }

      const query = db
        .select()
        .from(costEvents)
        .where(and(...conditions))
        .orderBy(desc(costEvents.occurredAt));

      if (opts?.limit) {
        return query.limit(opts.limit).all();
      }

      return query.all();
    },

    getMonthlySpend(teamId: string) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthMs = monthStart.getTime();

      const row = db
        .select({ totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)` })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.teamId, teamId),
            sql`${costEvents.occurredAt} >= ${monthMs}`,
          ),
        )
        .get();

      return { totalCents: row?.totalCents ?? 0 };
    },

    getSpendByAgent(teamId: string) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthMs = monthStart.getTime();

      return db
        .select({
          agentId: costEvents.agentId,
          totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)`,
          totalInputTokens: sql<number>`coalesce(sum(${costEvents.inputTokens}), 0)`,
          totalOutputTokens: sql<number>`coalesce(sum(${costEvents.outputTokens}), 0)`,
        })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.teamId, teamId),
            sql`${costEvents.occurredAt} >= ${monthMs}`,
          ),
        )
        .groupBy(costEvents.agentId)
        .all();
    },
  };
}
