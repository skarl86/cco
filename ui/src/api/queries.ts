import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';

interface ApiResponse<T> {
  data: T;
}

// --- Teams ---

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get<ApiResponse<any[]>>('/teams').then((r) => r.data),
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<ApiResponse<any>>('/teams', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

// --- Agents ---

export function useAgents(teamId: string) {
  return useQuery({
    queryKey: ['agents', teamId],
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/agents`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useAgent(teamId: string, agentId: string) {
  return useQuery({
    queryKey: ['agents', teamId, agentId],
    queryFn: () => api.get<ApiResponse<any>>(`/teams/${teamId}/agents/${agentId}`).then((r) => r.data),
    enabled: !!teamId && !!agentId,
  });
}

export function useCreateAgent(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; role?: string; adapterType?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/agents`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', teamId] }),
  });
}

export function useRunAgent(teamId: string, agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { prompt: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/agents/${agentId}/run`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs', teamId] });
      qc.invalidateQueries({ queryKey: ['agents', teamId] });
    },
  });
}

// --- Tasks ---

export function useTasks(teamId: string, filters?: { status?: string }) {
  return useQuery({
    queryKey: ['tasks', teamId, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return api.get<ApiResponse<any[]>>(`/teams/${teamId}/tasks${qs ? `?${qs}` : ''}`).then((r) => r.data);
    },
    enabled: !!teamId,
  });
}

export function useCreateTask(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; priority?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/tasks`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', teamId] }),
  });
}

export function useUpdateTask(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; title?: string }) =>
      api.patch<ApiResponse<any>>(`/teams/${teamId}/tasks/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', teamId] }),
  });
}

// --- Runs ---

export function useRuns(teamId: string) {
  return useQuery({
    queryKey: ['runs', teamId],
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/runs`).then((r) => r.data),
    enabled: !!teamId,
  });
}

export function useRun(runId: string) {
  return useQuery({
    queryKey: ['runs', 'detail', runId],
    queryFn: () => api.get<ApiResponse<any>>(`/runs/${runId}`).then((r) => r.data),
    enabled: !!runId,
  });
}

// --- Comments ---

export function useComments(teamId: string, taskId: string) {
  return useQuery({
    queryKey: ['comments', teamId, taskId],
    queryFn: () => api.get<ApiResponse<any[]>>(`/teams/${teamId}/tasks/${taskId}/comments`).then((r) => r.data),
    enabled: !!teamId && !!taskId,
  });
}

export function useCreateComment(teamId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; authorType?: string }) =>
      api.post<ApiResponse<any>>(`/teams/${teamId}/tasks/${taskId}/comments`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', teamId, taskId] }),
  });
}
