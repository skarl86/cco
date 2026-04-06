import type { ServerAdapterModule } from '@cco/adapter-utils';
import { executeClaudeCode } from './execute.js';
import { testClaudeEnvironment } from './test-env.js';

export const claudeCodeAdapter: ServerAdapterModule = {
  type: 'claude_code',

  async execute(ctx) {
    return executeClaudeCode(ctx);
  },

  async testEnvironment(ctx) {
    return testClaudeEnvironment(ctx.config);
  },

  models: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
};

export { parseClaudeStreamJson, detectLoginRequired, isMaxTurnsResult } from './parse.js';
export { buildClaudeArgs } from './execute.js';
export { testClaudeEnvironment } from './test-env.js';
