import type { ServerAdapterModule } from '@cco/adapter-utils';
import { executeOpenCode } from './execute.js';
import { testOpenCodeEnvironment } from './test-env.js';

export const openCodeAdapter: ServerAdapterModule = {
  type: 'opencode_local',

  async execute(ctx) {
    return executeOpenCode(ctx);
  },

  async testEnvironment(ctx) {
    return testOpenCodeEnvironment(ctx.config);
  },
};

export { executeOpenCode } from './execute.js';
export { testOpenCodeEnvironment } from './test-env.js';
