import path from 'node:path';

function sanitize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');
}

export function buildBranchName(agentName: string, taskIdentifier: string): string {
  const agent = sanitize(agentName);
  const task = taskIdentifier.replace(/\s+/g, '-');
  return `cco/${agent}/${task}`;
}

export function buildWorktreePath(repoRoot: string, branchName: string): string {
  const dirName = branchName.replace(/\//g, '-');
  return path.join(repoRoot, '.worktrees', dirName);
}
