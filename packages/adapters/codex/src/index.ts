import type { ServerAdapterModule } from '@cco/adapter-utils';
import { executeCodex } from './execute.js';
import { testCodexEnvironment } from './test-env.js';

export const codexAdapter: ServerAdapterModule = {
  type: 'codex_local',

  async execute(ctx) {
    return executeCodex(ctx);
  },

  async testEnvironment(ctx) {
    return testCodexEnvironment(ctx.config);
  },

  models: [
    { id: 'o4-mini', label: 'O4 Mini' },
    { id: 'o3', label: 'O3' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
  ],
};

export { executeCodex } from './execute.js';
export { testCodexEnvironment } from './test-env.js';
