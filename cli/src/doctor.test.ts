import { describe, it, expect } from 'vitest';
import { runDiagnostics, type DiagnosticResult } from './doctor.js';

describe('runDiagnostics', () => {
  it('returns an array of diagnostic results', async () => {
    const results = await runDiagnostics();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('checks Node.js version', async () => {
    const results = await runDiagnostics();
    const nodeCheck = results.find((r) => r.name === 'Node.js');
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck!.status).toBe('ok');
  });

  it('checks for claude CLI', async () => {
    const results = await runDiagnostics();
    const claudeCheck = results.find((r) => r.name === 'Claude CLI');
    expect(claudeCheck).toBeDefined();
    // May be 'ok' or 'warn' depending on environment
    expect(['ok', 'warn', 'error']).toContain(claudeCheck!.status);
  });

  it('each result has name, status, and message', async () => {
    const results = await runDiagnostics();
    for (const result of results) {
      expect(result.name).toBeDefined();
      expect(['ok', 'warn', 'error']).toContain(result.status);
      expect(typeof result.message).toBe('string');
    }
  });
});
