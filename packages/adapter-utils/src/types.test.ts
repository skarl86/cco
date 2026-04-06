import { describe, it, expect } from 'vitest';
import type {
  AdapterAgent,
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterEnvironmentTestResult,
  ServerAdapterModule,
} from './types.js';

describe('Adapter types', () => {
  it('AdapterAgent type is structurally correct', () => {
    const agent: AdapterAgent = {
      id: 'agent_1',
      teamId: 'team_1',
      name: 'Test Agent',
      role: 'developer',
      adapterType: 'claude_code',
      adapterConfig: { model: 'claude-sonnet-4-6' },
    };
    expect(agent.id).toBe('agent_1');
    expect(agent.adapterConfig.model).toBe('claude-sonnet-4-6');
  });

  it('AdapterExecutionResult has required fields', () => {
    const result: AdapterExecutionResult = {
      exitCode: 0,
      signal: null,
      timedOut: false,
    };
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('AdapterExecutionResult supports optional usage', () => {
    const result: AdapterExecutionResult = {
      exitCode: 0,
      signal: null,
      timedOut: false,
      usage: { inputTokens: 1000, outputTokens: 500, cachedInputTokens: 200 },
      costUsd: 0.03,
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
    };
    expect(result.usage?.inputTokens).toBe(1000);
    expect(result.costUsd).toBe(0.03);
  });

  it('AdapterEnvironmentTestResult structure', () => {
    const ok: AdapterEnvironmentTestResult = { ok: true };
    const fail: AdapterEnvironmentTestResult = {
      ok: false,
      error: 'claude CLI not found',
    };
    expect(ok.ok).toBe(true);
    expect(fail.error).toBe('claude CLI not found');
  });
});
