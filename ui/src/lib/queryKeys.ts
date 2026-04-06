/**
 * Centralized query key factory for React Query.
 * Hierarchical structure enables targeted invalidation.
 */

export const queryKeys = {
  teams: {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', id] as const,
  },
  agents: {
    list: (teamId: string) => ['agents', teamId] as const,
    detail: (teamId: string, agentId: string) => ['agents', teamId, agentId] as const,
    keys: (teamId: string, agentId: string) => ['agents', teamId, agentId, 'keys'] as const,
  },
  tasks: {
    list: (teamId: string, filters?: Record<string, unknown>) => ['tasks', teamId, filters] as const,
    detail: (teamId: string, taskId: string) => ['tasks', teamId, taskId] as const,
  },
  runs: {
    list: (teamId: string) => ['runs', teamId] as const,
    detail: (runId: string) => ['runs', 'detail', runId] as const,
  },
  comments: {
    list: (teamId: string, taskId: string) => ['comments', teamId, taskId] as const,
  },
  goals: {
    list: (teamId: string) => ['goals', teamId] as const,
    detail: (teamId: string, goalId: string) => ['goals', teamId, goalId] as const,
  },
  approvals: {
    list: (teamId: string, status?: string) => ['approvals', teamId, status] as const,
    detail: (teamId: string, id: string) => ['approvals', teamId, id] as const,
  },
  routines: {
    list: (teamId: string) => ['routines', teamId] as const,
    detail: (teamId: string, id: string) => ['routines', teamId, id] as const,
  },
  activity: {
    list: (teamId: string) => ['activity', teamId] as const,
  },
  dashboard: {
    data: (teamId: string) => ['dashboard', teamId] as const,
    badges: (teamId: string) => ['sidebar-badges', teamId] as const,
  },
  costs: {
    list: (teamId: string) => ['costs', teamId] as const,
    monthly: (teamId: string) => ['costs', teamId, 'monthly'] as const,
    byAgent: (teamId: string) => ['costs', teamId, 'by-agent'] as const,
  },
  documents: {
    list: (teamId: string, taskId: string) => ['documents', teamId, taskId] as const,
  },
  feedback: {
    list: (teamId: string) => ['feedback', teamId] as const,
    summary: (teamId: string, targetType: string, targetId: string) =>
      ['feedback', teamId, 'summary', targetType, targetId] as const,
  },
  adapters: {
    all: ['adapters'] as const,
  },
  workspaces: {
    list: (teamId: string) => ['workspaces', teamId] as const,
    detail: (teamId: string, id: string) => ['workspaces', teamId, id] as const,
    runs: (teamId: string, workspaceId: string) => ['workspaces', teamId, workspaceId, 'runs'] as const,
  },
} as const;
