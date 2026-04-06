import { z } from 'zod';

// --- Enums ---

export const AgentRoleSchema = z.enum(['architect', 'developer', 'reviewer', 'tester', 'general']);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentStatusSchema = z.enum(['idle', 'running', 'paused', 'error']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const TaskStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const RunStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunInvocationSourceSchema = z.enum(['on_demand', 'heartbeat', 'routine', 'wake']);
export type RunInvocationSource = z.infer<typeof RunInvocationSourceSchema>;

export const BudgetWindowKindSchema = z.enum(['monthly', 'lifetime']);
export type BudgetWindowKind = z.infer<typeof BudgetWindowKindSchema>;

export const ApprovalTypeSchema = z.enum(['code_review', 'deploy', 'hire_agent', 'strategy']);
export type ApprovalType = z.infer<typeof ApprovalTypeSchema>;

export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

// --- Create Schemas ---

export const CreateTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  taskPrefix: z.string().optional(),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1),
  role: AgentRoleSchema.default('general'),
  title: z.string().optional(),
  reportsTo: z.string().optional(),
  adapterType: z.string().default('claude_code'),
  adapterConfig: z.record(z.unknown()).optional(),
  budgetMonthlyCents: z.number().int().min(0).optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  parentId: z.string().optional(),
  projectId: z.string().optional(),
  assigneeAgentId: z.string().optional(),
});
