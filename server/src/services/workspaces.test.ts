import { describe, it, expect } from 'vitest';
import { buildBranchName, buildWorktreePath } from './workspaces.js';

describe('Workspace utilities', () => {
  it('builds a branch name from agent and task', () => {
    const branch = buildBranchName('architect-bot', 'CCO-42');
    expect(branch).toBe('cco/architect-bot/CCO-42');
  });

  it('sanitizes special characters in branch name', () => {
    const branch = buildBranchName('My Agent!', 'TSK 1');
    expect(branch).toBe('cco/my-agent/TSK-1');
  });

  it('builds worktree path', () => {
    const path = buildWorktreePath('/home/user/repos/cco', 'cco/dev-bot/CCO-1');
    expect(path).toBe('/home/user/repos/cco/.worktrees/cco-dev-bot-CCO-1');
  });
});
