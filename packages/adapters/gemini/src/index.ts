import type { ServerAdapterModule } from '@cco/adapter-utils';
import { executeGemini } from './execute.js';
import { testGeminiEnvironment } from './test-env.js';

export const geminiAdapter: ServerAdapterModule = {
  type: 'gemini_local',

  async execute(ctx) {
    return executeGemini(ctx);
  },

  async testEnvironment(ctx) {
    return testGeminiEnvironment(ctx.config);
  },

  models: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
};

export { executeGemini } from './execute.js';
export { testGeminiEnvironment } from './test-env.js';
