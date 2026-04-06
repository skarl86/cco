import { eq, and } from 'drizzle-orm';
import { createHmac, randomBytes } from 'node:crypto';
import { agentApiKeys } from '@cco/db';
import { generateId } from '@cco/shared';
import type { Database } from '@cco/db';

/**
 * HMAC-SHA256 key hashing with a server-side secret.
 * This prevents offline brute-force if the DB is compromised,
 * since the attacker also needs the HMAC secret.
 */
const HMAC_SECRET = process.env.API_KEY_HMAC_SECRET ?? 'cco-default-hmac-secret-change-in-production';

function hashKey(rawKey: string): string {
  return createHmac('sha256', HMAC_SECRET).update(rawKey).digest('hex');
}

export function createAgentKeysService(database: Database) {
  const { db } = database;

  return {
    list(teamId: string, agentId: string) {
      return db
        .select({
          id: agentApiKeys.id,
          name: agentApiKeys.name,
          keyPrefix: agentApiKeys.keyPrefix,
          lastUsedAt: agentApiKeys.lastUsedAt,
          createdAt: agentApiKeys.createdAt,
        })
        .from(agentApiKeys)
        .where(
          and(eq(agentApiKeys.teamId, teamId), eq(agentApiKeys.agentId, agentId)),
        )
        .all();
    },

    create(teamId: string, agentId: string, name: string) {
      const rawKey = randomBytes(32).toString('hex');
      const keyH = hashKey(rawKey);
      const keyPrefix = rawKey.slice(0, 8);
      const now = Date.now();
      const id = generateId('akey');

      const row = {
        id,
        teamId,
        agentId,
        name,
        keyHash: keyH,
        keyPrefix,
        createdAt: now,
      };

      db.insert(agentApiKeys).values(row).run();

      return {
        id,
        name,
        keyPrefix,
        key: rawKey,
        createdAt: now,
      };
    },

    revoke(teamId: string, agentId: string, keyId: string) {
      const existing = db
        .select({ id: agentApiKeys.id })
        .from(agentApiKeys)
        .where(
          and(
            eq(agentApiKeys.teamId, teamId),
            eq(agentApiKeys.agentId, agentId),
            eq(agentApiKeys.id, keyId),
          ),
        )
        .get();

      return existing
        ? (db.delete(agentApiKeys).where(eq(agentApiKeys.id, keyId)).run(), true)
        : false;
    },

    validateKey(rawKey: string): { agentId: string; teamId: string } | null {
      const keyH = hashKey(rawKey);
      const row = db
        .select({
          agentId: agentApiKeys.agentId,
          teamId: agentApiKeys.teamId,
        })
        .from(agentApiKeys)
        .where(eq(agentApiKeys.keyHash, keyH))
        .get();

      if (!row) return null;

      db.update(agentApiKeys)
        .set({ lastUsedAt: Date.now() })
        .where(eq(agentApiKeys.keyHash, keyH))
        .run();

      return row;
    },
  };
}
