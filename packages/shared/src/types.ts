import type {
  AgentRole,
  AgentStatus,
  TaskStatus,
  TaskPriority,
  RunStatus,
  RunInvocationSource,
  BudgetWindowKind,
  ApprovalType,
  ApprovalStatus,
} from './validators.js';

export interface Team {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: 'active' | 'paused';
  readonly taskPrefix: string;
  readonly taskCounter: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Agent {
  readonly id: string;
  readonly teamId: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly title: string | null;
  readonly status: AgentStatus;
  readonly reportsTo: string | null;
  readonly adapterType: string;
  readonly adapterConfig: Record<string, unknown>;
  readonly budgetMonthlyCents: number;
  readonly spentMonthlyCents: number;
  readonly pauseReason: string | null;
  readonly pausedAt: number | null;
  readonly lastHeartbeatAt: number | null;
  readonly permissions: Record<string, unknown>;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Task {
  readonly id: string;
  readonly teamId: string;
  readonly projectId: string | null;
  readonly parentId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeAgentId: string | null;
  readonly checkoutRunId: string | null;
  readonly executionLockedAt: number | null;
  readonly taskNumber: number | null;
  readonly identifier: string | null;
  readonly originKind: 'manual' | 'agent' | 'routine';
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Run {
  readonly id: string;
  readonly teamId: string;
  readonly agentId: string;
  readonly taskId: string | null;
  readonly invocationSource: RunInvocationSource;
  readonly status: RunStatus;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  readonly exitCode: number | null;
  readonly error: string | null;
  readonly errorCode: string | null;
  readonly usageJson: Record<string, unknown> | null;
  readonly resultJson: Record<string, unknown> | null;
  readonly sessionIdBefore: string | null;
  readonly sessionIdAfter: string | null;
  readonly stdoutExcerpt: string | null;
  readonly stderrExcerpt: string | null;
  readonly logPath: string | null;
  readonly processPid: number | null;
  readonly contextSnapshot: Record<string, unknown> | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CostEvent {
  readonly id: string;
  readonly teamId: string;
  readonly agentId: string;
  readonly taskId: string | null;
  readonly projectId: string | null;
  readonly runId: string | null;
  readonly provider: string;
  readonly model: string;
  readonly billingType: string;
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly costCents: number;
  readonly occurredAt: number;
  readonly createdAt: number;
}

export interface Project {
  readonly id: string;
  readonly teamId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: 'active' | 'archived';
  readonly repoUrl: string | null;
  readonly repoPath: string | null;
  readonly baseBranch: string;
  readonly worktreeParentDir: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Approval {
  readonly id: string;
  readonly teamId: string;
  readonly type: ApprovalType;
  readonly requestedByAgentId: string | null;
  readonly status: ApprovalStatus;
  readonly payload: Record<string, unknown>;
  readonly decisionNote: string | null;
  readonly decidedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface BudgetPolicy {
  readonly id: string;
  readonly teamId: string;
  readonly scopeType: 'team' | 'agent' | 'project';
  readonly scopeId: string;
  readonly windowKind: BudgetWindowKind;
  readonly amountCents: number;
  readonly warnPercent: number;
  readonly hardStopEnabled: boolean;
  readonly isActive: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Routine {
  readonly id: string;
  readonly teamId: string;
  readonly projectId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly assigneeAgentId: string;
  readonly cronExpression: string | null;
  readonly timezone: string;
  readonly status: 'active' | 'paused' | 'disabled';
  readonly concurrencyPolicy: 'coalesce' | 'always';
  readonly nextRunAt: number | null;
  readonly lastTriggeredAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface TaskComment {
  readonly id: string;
  readonly teamId: string;
  readonly taskId: string;
  readonly authorAgentId: string | null;
  readonly authorType: 'system' | 'agent' | 'user';
  readonly body: string;
  readonly createdAt: number;
}

export interface ActivityLog {
  readonly id: string;
  readonly teamId: string;
  readonly actorType: 'user' | 'agent' | 'system';
  readonly actorId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly detail: Record<string, unknown> | null;
  readonly createdAt: number;
}
