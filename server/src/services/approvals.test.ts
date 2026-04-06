import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabase, type Database, teams, agents } from '@cco/db';
import { createApprovalsService } from './approvals.js';

describe('ApprovalsService', () => {
  let database: Database;
  let service: ReturnType<typeof createApprovalsService>;
  const teamId = 'team_appr';

  beforeAll(() => {
    database = createDatabase(':memory:');
    service = createApprovalsService(database);
    const now = Date.now();

    database.db.insert(teams).values({
      id: teamId, name: 'Approval Team', status: 'active',
      taskPrefix: 'AP', taskCounter: 0, createdAt: now, updatedAt: now,
    }).run();

    database.db.insert(agents).values({
      id: 'agent_appr', teamId, name: 'Approval Agent', role: 'developer',
      status: 'idle', adapterType: 'mock', adapterConfig: '{}',
      budgetMonthlyCents: 0, spentMonthlyCents: 0, permissions: '{}',
      createdAt: now, updatedAt: now,
    }).run();
  });

  afterAll(() => database.close());

  it('creates an approval request', () => {
    const approval = service.create({
      teamId,
      type: 'code_review',
      requestedByAgentId: 'agent_appr',
      payload: { prUrl: 'https://github.com/test/pr/1', summary: 'Fix login bug' },
    });
    expect(approval.id).toBeDefined();
    expect(approval.status).toBe('pending');
    expect(approval.type).toBe('code_review');
  });

  it('lists pending approvals', () => {
    const list = service.listPending(teamId);
    expect(list.length).toBe(1);
  });

  it('approves a request', () => {
    const approval = service.create({
      teamId,
      type: 'deploy',
      requestedByAgentId: 'agent_appr',
      payload: { environment: 'production' },
    });

    const decided = service.decide(teamId, approval.id, 'approved', 'Looks good');
    expect(decided!.status).toBe('approved');
    expect(decided!.decisionNote).toBe('Looks good');
    expect(decided!.decidedAt).toBeGreaterThan(0);
  });

  it('rejects a request', () => {
    const approval = service.create({
      teamId,
      type: 'hire_agent',
      requestedByAgentId: 'agent_appr',
      payload: { agentName: 'New Bot', reason: 'Need more capacity' },
    });

    const decided = service.decide(teamId, approval.id, 'rejected', 'Budget constraints');
    expect(decided!.status).toBe('rejected');
    expect(decided!.decisionNote).toBe('Budget constraints');
  });

  it('cannot decide on already decided approval', () => {
    const approval = service.create({
      teamId,
      type: 'strategy',
      requestedByAgentId: 'agent_appr',
      payload: { plan: 'Refactor auth' },
    });

    service.decide(teamId, approval.id, 'approved', 'Go ahead');
    expect(() => service.decide(teamId, approval.id, 'rejected', 'Changed mind')).toThrow();
  });

  it('lists all approvals', () => {
    const all = service.list(teamId);
    expect(all.length).toBeGreaterThanOrEqual(4);
  });

  it('gets approval by id', () => {
    const approval = service.create({
      teamId,
      type: 'code_review',
      requestedByAgentId: 'agent_appr',
      payload: { file: 'main.ts' },
    });

    const found = service.getById(teamId, approval.id);
    expect(found).toBeDefined();
    expect(found!.type).toBe('code_review');
  });
});
