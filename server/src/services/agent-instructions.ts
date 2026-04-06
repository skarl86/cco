import { eq } from 'drizzle-orm';
import { agents } from '@cco/db';
import type { Database } from '@cco/db';

interface AgentMetadata {
  instructions?: string;
  [key: string]: unknown;
}

function parseMetadata(raw: string | null): AgentMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as AgentMetadata;
  } catch {
    return {};
  }
}

export function createAgentInstructionsService(database: Database) {
  const { db } = database;

  return {
    get(agentId: string): string {
      const row = db
        .select({ metadata: agents.metadata })
        .from(agents)
        .where(eq(agents.id, agentId))
        .get();

      if (!row) return '';
      const meta = parseMetadata(row.metadata);
      return meta.instructions ?? '';
    },

    update(agentId: string, instructions: string) {
      const row = db
        .select({ metadata: agents.metadata })
        .from(agents)
        .where(eq(agents.id, agentId))
        .get();

      if (!row) return null;

      const meta = parseMetadata(row.metadata);
      const updated: AgentMetadata = { ...meta, instructions };

      db.update(agents)
        .set({ metadata: JSON.stringify(updated), updatedAt: Date.now() })
        .where(eq(agents.id, agentId))
        .run();

      return instructions;
    },

    getPermissions(agentId: string): Record<string, boolean> {
      const row = db
        .select({ permissions: agents.permissions })
        .from(agents)
        .where(eq(agents.id, agentId))
        .get();

      if (!row) return {};
      try {
        return JSON.parse(row.permissions) as Record<string, boolean>;
      } catch {
        return {};
      }
    },

    updatePermissions(agentId: string, permissions: Record<string, boolean>) {
      const row = db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.id, agentId))
        .get();

      if (!row) return null;

      db.update(agents)
        .set({ permissions: JSON.stringify(permissions), updatedAt: Date.now() })
        .where(eq(agents.id, agentId))
        .run();

      return permissions;
    },
  };
}
