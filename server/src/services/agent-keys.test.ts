import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, agents } from '@cco/db';
import { createAgentKeysService } from './agent-keys.js';

describe('AgentKeysService', () => {
  let database: Database;
  let service: ReturnType<typeof createAgentKeysService>;
  const teamId = 'team_akeys';
  const agentId = 'agent_akeys_1';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createAgentKeysService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Keys Team', status: 'active',
      taskPrefix: 'AK', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: agentId, teamId, name: 'Key Agent', role: 'general',
      status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates a key and returns the raw key', () => {
    const result = service.create(teamId, agentId, 'deploy-key');
    expect(result.id).toBeDefined();
    expect(result.name).toBe('deploy-key');
    expect(result.key).toBeDefined();
    expect(result.key.length).toBe(64); // 32 bytes hex
    expect(result.keyPrefix).toBe(result.key.slice(0, 8));
  });

  it('list returns name and prefix but not the hash', () => {
    const list = service.list(teamId, agentId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const entry = list[0];
    expect(entry.name).toBe('deploy-key');
    expect(entry.keyPrefix).toBeDefined();
    expect(entry.keyPrefix.length).toBe(8);
    // Should NOT have keyHash in the returned fields
    expect((entry as Record<string, unknown>).keyHash).toBeUndefined();
  });

  it('validateKey with correct key returns agentId and teamId', () => {
    const created = service.create(teamId, agentId, 'validate-key');
    const result = service.validateKey(created.key);
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe(agentId);
    expect(result!.teamId).toBe(teamId);
  });

  it('validateKey with wrong key returns null', () => {
    const result = service.validateKey('0000000000000000000000000000000000000000000000000000000000000000');
    expect(result).toBeNull();
  });

  it('revoke key removes it', () => {
    const created = service.create(teamId, agentId, 'revoke-me');
    // Validate before revoke
    const validBefore = service.validateKey(created.key);
    expect(validBefore).not.toBeNull();

    // Revoke
    const revoked = service.revoke(teamId, agentId, created.id);
    expect(revoked).toBe(true);

    // Validate after revoke returns null
    const validAfter = service.validateKey(created.key);
    expect(validAfter).toBeNull();
  });

  it('revoke returns false for non-existent key', () => {
    const result = service.revoke(teamId, agentId, 'akey_nonexistent');
    expect(result).toBe(false);
  });

  it('creates multiple keys for the same agent', () => {
    const k1 = service.create(teamId, agentId, 'multi-1');
    const k2 = service.create(teamId, agentId, 'multi-2');
    expect(k1.key).not.toBe(k2.key);

    const list = service.list(teamId, agentId);
    const names = list.map((k) => k.name);
    expect(names).toContain('multi-1');
    expect(names).toContain('multi-2');
  });
});
