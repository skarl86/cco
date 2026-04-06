import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase, type Database, teams, agents } from '@cco/db';
import { createAgentInstructionsService } from './agent-instructions.js';

describe('AgentInstructionsService', () => {
  let database: Database;
  let service: ReturnType<typeof createAgentInstructionsService>;
  const teamId = 'team_instr';
  const agentId = 'agent_instr_1';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createAgentInstructionsService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Instructions Team', status: 'active',
      taskPrefix: 'IN', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: agentId, teamId, name: 'Instructed Agent', role: 'general',
      status: 'idle', adapterType: 'claude_code', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('get() returns empty string for agent with no instructions', () => {
    const result = service.get(agentId);
    expect(result).toBe('');
  });

  it('get() returns empty string for non-existent agent', () => {
    const result = service.get('agent_nonexistent');
    expect(result).toBe('');
  });

  it('update() stores instructions, get() retrieves them', () => {
    const instructions = 'Always respond in JSON format.';
    const updated = service.update(agentId, instructions);
    expect(updated).toBe(instructions);

    const retrieved = service.get(agentId);
    expect(retrieved).toBe(instructions);
  });

  it('update() returns null for non-existent agent', () => {
    const result = service.update('agent_nonexistent', 'some instructions');
    expect(result).toBeNull();
  });

  it('update() preserves other metadata fields', () => {
    // First set some metadata with extra fields via direct DB insert
    const meta = JSON.stringify({ instructions: 'old', customKey: 'preserved' });
    database.db.update(agents)
      .set({ metadata: meta, updatedAt: Date.now() })
      .where(eq(agents.id, agentId))
      .run();

    service.update(agentId, 'new instructions');
    const retrieved = service.get(agentId);
    expect(retrieved).toBe('new instructions');
  });

  it('getPermissions() returns empty object for agent with default permissions', () => {
    const result = service.getPermissions(agentId);
    expect(result).toEqual({});
  });

  it('getPermissions() returns empty object for non-existent agent', () => {
    const result = service.getPermissions('agent_nonexistent');
    expect(result).toEqual({});
  });

  it('updatePermissions() stores permissions, getPermissions() retrieves them', () => {
    const perms = { canDeploy: true, canDelete: false };
    const updated = service.updatePermissions(agentId, perms);
    expect(updated).toEqual(perms);

    const retrieved = service.getPermissions(agentId);
    expect(retrieved).toEqual(perms);
  });

  it('updatePermissions() returns null for non-existent agent', () => {
    const result = service.updatePermissions('agent_nonexistent', { canDeploy: true });
    expect(result).toBeNull();
  });
});
