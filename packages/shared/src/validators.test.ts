import { describe, it, expect } from 'vitest';
import {
  AgentRoleSchema,
  AgentStatusSchema,
  TaskStatusSchema,
  TaskPrioritySchema,
  RunStatusSchema,
  RunInvocationSourceSchema,
  BudgetWindowKindSchema,
  ApprovalTypeSchema,
  ApprovalStatusSchema,
  CreateAgentSchema,
  CreateTaskSchema,
  CreateTeamSchema,
} from './validators.js';

describe('Enum validators', () => {
  it('validates agent roles', () => {
    expect(AgentRoleSchema.parse('architect')).toBe('architect');
    expect(AgentRoleSchema.parse('developer')).toBe('developer');
    expect(AgentRoleSchema.parse('reviewer')).toBe('reviewer');
    expect(AgentRoleSchema.parse('tester')).toBe('tester');
    expect(AgentRoleSchema.parse('general')).toBe('general');
    expect(() => AgentRoleSchema.parse('invalid')).toThrow();
  });

  it('validates agent statuses', () => {
    expect(AgentStatusSchema.parse('idle')).toBe('idle');
    expect(AgentStatusSchema.parse('running')).toBe('running');
    expect(AgentStatusSchema.parse('paused')).toBe('paused');
    expect(AgentStatusSchema.parse('error')).toBe('error');
    expect(() => AgentStatusSchema.parse('unknown')).toThrow();
  });

  it('validates task statuses', () => {
    const valid = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    for (const s of valid) {
      expect(TaskStatusSchema.parse(s)).toBe(s);
    }
    expect(() => TaskStatusSchema.parse('invalid')).toThrow();
  });

  it('validates task priorities', () => {
    const valid = ['low', 'medium', 'high', 'urgent'];
    for (const p of valid) {
      expect(TaskPrioritySchema.parse(p)).toBe(p);
    }
    expect(() => TaskPrioritySchema.parse('critical')).toThrow();
  });

  it('validates run statuses', () => {
    const valid = ['queued', 'running', 'completed', 'failed', 'cancelled'];
    for (const s of valid) {
      expect(RunStatusSchema.parse(s)).toBe(s);
    }
  });

  it('validates run invocation sources', () => {
    const valid = ['on_demand', 'heartbeat', 'routine', 'wake'];
    for (const s of valid) {
      expect(RunInvocationSourceSchema.parse(s)).toBe(s);
    }
  });

  it('validates budget window kinds', () => {
    expect(BudgetWindowKindSchema.parse('monthly')).toBe('monthly');
    expect(BudgetWindowKindSchema.parse('lifetime')).toBe('lifetime');
  });

  it('validates approval types', () => {
    const valid = ['code_review', 'deploy', 'hire_agent', 'strategy'];
    for (const t of valid) {
      expect(ApprovalTypeSchema.parse(t)).toBe(t);
    }
  });

  it('validates approval statuses', () => {
    const valid = ['pending', 'approved', 'rejected'];
    for (const s of valid) {
      expect(ApprovalStatusSchema.parse(s)).toBe(s);
    }
  });
});

describe('CreateTeamSchema', () => {
  it('validates a valid team', () => {
    const result = CreateTeamSchema.parse({
      name: 'My Team',
      description: 'A test team',
    });
    expect(result.name).toBe('My Team');
    expect(result.description).toBe('A test team');
  });

  it('requires name', () => {
    expect(() => CreateTeamSchema.parse({})).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => CreateTeamSchema.parse({ name: '' })).toThrow();
  });
});

describe('CreateAgentSchema', () => {
  it('validates a valid agent', () => {
    const result = CreateAgentSchema.parse({
      name: 'Architect Bot',
      role: 'architect',
      title: 'Lead Architect',
      adapterType: 'claude_code',
    });
    expect(result.name).toBe('Architect Bot');
    expect(result.role).toBe('architect');
  });

  it('defaults role to general', () => {
    const result = CreateAgentSchema.parse({
      name: 'Agent',
    });
    expect(result.role).toBe('general');
  });

  it('defaults adapterType to claude_code', () => {
    const result = CreateAgentSchema.parse({
      name: 'Agent',
    });
    expect(result.adapterType).toBe('claude_code');
  });

  it('rejects empty name', () => {
    expect(() => CreateAgentSchema.parse({ name: '' })).toThrow();
  });
});

describe('CreateTaskSchema', () => {
  it('validates a valid task', () => {
    const result = CreateTaskSchema.parse({
      title: 'Fix login bug',
      description: 'Users cannot login with OAuth',
      priority: 'high',
    });
    expect(result.title).toBe('Fix login bug');
    expect(result.priority).toBe('high');
  });

  it('defaults priority to medium', () => {
    const result = CreateTaskSchema.parse({
      title: 'Some task',
    });
    expect(result.priority).toBe('medium');
  });

  it('defaults status to backlog', () => {
    const result = CreateTaskSchema.parse({
      title: 'Some task',
    });
    expect(result.status).toBe('backlog');
  });

  it('rejects empty title', () => {
    expect(() => CreateTaskSchema.parse({ title: '' })).toThrow();
  });
});
