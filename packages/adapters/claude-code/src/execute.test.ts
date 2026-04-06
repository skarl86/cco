import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildClaudeArgs, DEFAULT_ALLOWED_TOOLS } from './execute.js';

describe('buildClaudeArgs', () => {
  it('builds basic args with print and stream-json', () => {
    const args = buildClaudeArgs({});
    expect(args).toContain('--print');
    expect(args).toContain('-');
    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--verbose');
  });

  it('adds --resume with sessionId', () => {
    const args = buildClaudeArgs({ sessionId: 'sess-123' });
    expect(args).toContain('--resume');
    expect(args).toContain('sess-123');
  });

  it('adds --model when specified', () => {
    const args = buildClaudeArgs({ model: 'claude-opus-4-6' });
    expect(args).toContain('--model');
    expect(args).toContain('claude-opus-4-6');
  });

  it('adds --max-turns when specified', () => {
    const args = buildClaudeArgs({ maxTurns: 5 });
    expect(args).toContain('--max-turns');
    expect(args).toContain('5');
  });

  it('adds --dangerously-skip-permissions when allowUnsafe is true', () => {
    const args = buildClaudeArgs({ allowUnsafe: true });
    expect(args).toContain('--dangerously-skip-permissions');
  });

  it('does not add --dangerously-skip-permissions by default', () => {
    const args = buildClaudeArgs({});
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('adds --add-dir for skills directory', () => {
    const args = buildClaudeArgs({ skillsDir: '/tmp/skills' });
    expect(args).toContain('--add-dir');
    expect(args).toContain('/tmp/skills');
  });

  it('adds custom system prompt file', () => {
    const args = buildClaudeArgs({ systemPromptFile: '/tmp/prompt.md' });
    expect(args).toContain('--append-system-prompt-file');
    expect(args).toContain('/tmp/prompt.md');
  });

  it('adds default --allowedTools as single space-joined arg', () => {
    const args = buildClaudeArgs({});
    const idx = args.indexOf('--allowedTools');
    expect(idx).toBeGreaterThan(-1);
    const value = args[idx + 1];
    for (const tool of DEFAULT_ALLOWED_TOOLS) {
      expect(value).toContain(tool);
    }
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('adds custom --allowedTools as single space-joined arg', () => {
    const args = buildClaudeArgs({ allowedTools: ['Bash(git:*)', 'Read'] });
    const idx = args.indexOf('--allowedTools');
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe('Bash(git:*) Read');
  });

  it('prefers --dangerously-skip-permissions when allowUnsafe is true even with allowedTools', () => {
    const args = buildClaudeArgs({ allowUnsafe: true, allowedTools: ['Read'] });
    expect(args).toContain('--dangerously-skip-permissions');
    expect(args).not.toContain('--allowedTools');
  });

  it('falls back to default tools when allowedTools is empty', () => {
    const args = buildClaudeArgs({ allowedTools: [] });
    const idx = args.indexOf('--allowedTools');
    expect(idx).toBeGreaterThan(-1);
    const value = args[idx + 1];
    for (const tool of DEFAULT_ALLOWED_TOOLS) {
      expect(value).toContain(tool);
    }
  });
});
