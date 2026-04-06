import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';
import { queryKeys } from '../lib/queryKeys.js';

interface ApiResponse<T> {
  data: T;
}

// --- Teams ---

export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: () => api.get<ApiResponse<any[]>>('/teams').then((r) => r.data),
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: queryKeys.teams.detail(id),
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<ApiResponse<any>>('/teams', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams.all }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams.all }),
  });
}

// --- Agents ---

export function useAgents(teamId: string) {
  return useQuery({
    queryKey: queryKeys.agents.list(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/agents`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useAgent(teamId: string, agentId: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(teamId, agentId),
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${teamId}/agents/${agentId}`).then((r) => r.data),
    enabled: !!teamId && !!agentId,
  });
}

export function useCreateAgent(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; role?: string; adapterType?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/agents`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents.list(teamId) }),
  });
}

export function useRunAgent(teamId: string, agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { prompt: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/agents/${agentId}/run`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs'] });
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// --- Tasks ---

export function useTasks(teamId: string, filters?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.tasks.list(teamId, filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return api.get<ApiResponse<any[]>>(`/teams/${teamId}/tasks${qs ? `?${qs}` : ''}`).then((r) => r.data);
    },
    enabled: !!teamId,
  });
}

export function useTask(teamId: string, taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(teamId, taskId),
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${teamId}/tasks/${taskId}`).then((r) => r.data),
    enabled: !!teamId && !!taskId,
  });
}

export function useCreateTask(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; priority?: string; assigneeAgentId?: string; projectId?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/tasks`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; title?: string; assigneeAgentId?: string }) =>
      api.patch<ApiResponse<any>>(`/teams/${teamId}/tasks/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// --- Runs ---

export function useRuns(teamId: string) {
  return useQuery({
    queryKey: queryKeys.runs.list(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/runs`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useRun(runId: string | null) {
  return useQuery({
    queryKey: queryKeys.runs.detail(runId ?? ''),
    queryFn: () => api.get<ApiResponse<any>>(`/runs/${runId}`).then((r) => r.data),
    enabled: !!runId,
  });
}

// --- Comments ---

export function useComments(teamId: string, taskId: string) {
  return useQuery({
    queryKey: queryKeys.comments.list(teamId, taskId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/tasks/${taskId}/comments`).then((r) => r.data),
    enabled: !!teamId && !!taskId,
  });
}

export function useCreateComment(teamId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; authorType?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/tasks/${taskId}/comments`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.comments.list(teamId, taskId) }),
  });
}

// --- Goals ---

export function useGoals(teamId: string, projectId?: string) {
  return useQuery({
    queryKey: queryKeys.goals.list(teamId),
    queryFn: () => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return api.get<ApiResponse<any[]>>(`/teams/${teamId}/goals${qs}`).then((r) => r.data);
    },
    enabled: !!teamId,
  });
}

export function useCreateGoal(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; projectId?: string; parentId?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/goals`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.list(teamId) }),
  });
}

// --- Approvals ---

export function useApprovals(teamId: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.approvals.list(teamId, status),
    queryFn: () => {
      const qs = status ? `?status=${status}` : '';
      return api.get<ApiResponse<any[]>>(`/teams/${teamId}/approvals${qs}`).then((r) => r.data);
    },
    enabled: !!teamId,
  });
}

export function useDecideApproval(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approved' | 'rejected'; note?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/approvals/${id}/decide`, { decision, note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

// --- Routines ---

export function useRoutines(teamId: string) {
  return useQuery({
    queryKey: queryKeys.routines.list(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/routines`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useTriggerRoutine(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/routines/${id}/trigger`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// --- Activity ---

export function useActivity(teamId: string) {
  return useQuery({
    queryKey: queryKeys.activity.list(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/activity`).then((r) => r.data),
    enabled: !!teamId,
  });
}

// --- Dashboard ---

export function useDashboard(teamId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.data(teamId),
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${teamId}/dashboard`).then((r) => r.data),
    enabled: !!teamId,
    refetchInterval: 30_000,
  });
}

// --- Costs ---

export function useCosts(teamId: string) {
  return useQuery({
    queryKey: queryKeys.costs.list(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/costs`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useMonthlySpend(teamId: string) {
  return useQuery({
    queryKey: queryKeys.costs.monthly(teamId),
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${teamId}/costs/monthly`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useCostsByAgent(teamId: string) {
  return useQuery({
    queryKey: queryKeys.costs.byAgent(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/costs/by-agent`).then((r) => r.data),
    enabled: !!teamId,
  });
}

// --- Projects ---

export function useProjects(teamId: string) {
  return useQuery({
    queryKey: ['projects', teamId],
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/projects`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useCreateProject(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; repoUrl?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/projects`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// --- Adapters ---

export function useAdapters() {
  return useQuery({
    queryKey: queryKeys.adapters.all,
    queryFn: () => api.get<ApiResponse<any[]>>('/adapters').then((r) => r.data),
  });
}

// --- Workspaces ---

export function useWorkspaces(teamId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.list(teamId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/workspaces`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useCreateWorkspace(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; projectId?: string; branchName?: string; baseRef?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/workspaces`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces.list(teamId) }),
  });
}

export function useProvisionWorkspace(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/workspaces/${id}/provision`, {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces.list(teamId) }),
  });
}

export function useArchiveWorkspace(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/workspaces/${id}/archive`, {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces.list(teamId) }),
  });
}

// --- Documents ---

export function useDocuments(teamId: string, taskId: string) {
  return useQuery({
    queryKey: queryKeys.documents.list(teamId, taskId),
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/tasks/${taskId}/documents`).then((r) => r.data),
    enabled: !!teamId && !!taskId,
  });
}

// --- Feedback ---

export function useFeedbackSummary(teamId: string, targetType: string, targetId: string) {
  return useQuery({
    queryKey: queryKeys.feedback.summary(teamId, targetType, targetId),
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${teamId}/feedback/summary?targetType=${targetType}&targetId=${targetId}`).then((r) => r.data),
    enabled: !!teamId && !!targetId,
  });
}
