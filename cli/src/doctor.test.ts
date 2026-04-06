import { describe, it, expect } from 'vitest';
import { runDiagnostics, type CheckResult } from './doctor.js';

describe('runDiagnostics', () => {
  it('returns an array of check results', async () => {
    const results = await runDiagnostics();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('checks Node.js version', async () => {
    const results = await runDiagnostics();
    const nodeCheck = results.find((r) => r.name === 'Node.js');
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck!.status).toBe('pass');
  });

  it('checks for claude CLI', async () => {
    const results = await runDiagnostics();
    const claudeCheck = results.find((r) => r.name === 'Claude CLI');
    expect(claudeCheck).toBeDefined();
    expect(['pass', 'warn', 'fail']).toContain(claudeCheck!.status);
  });

  it('each result has name, status, and message', async () => {
    const results = await runDiagnostics();
    for (const result of results) {
      expect(result.name).toBeDefined();
      expect(['pass', 'warn', 'fail']).toContain(result.status);
      expect(typeof result.message).toBe('string');
    }
  });

  it('includes all expected checks', async () => {
    const results = await runDiagnostics();
    const names = results.map((r) => r.name);
    expect(names).toContain('Node.js');
    expect(names).toContain('pnpm');
    expect(names).toContain('Claude CLI');
    expect(names).toContain('Server reachable');
    expect(names).toContain('Database');
    expect(names).toContain('Config file');
    expect(names).toContain('CCO home directory');
    expect(names).toContain('API key');
    expect(names).toContain('Secrets key');
  });
});
