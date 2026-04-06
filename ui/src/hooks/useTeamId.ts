import { useTeams } from '@/api/queries';

export function useTeamId(): string {
  const { data: teams } = useTeams();
  return teams?.[0]?.id ?? '';
}
