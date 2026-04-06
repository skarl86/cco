import { client } from '../client.js';
import { ok, fail } from '../format.js';

export async function showStatus(): Promise<void> {
  try {
    const health = await client.get<{ status: string; version: string }>('/health');
    ok(`Server: ${health.status} (v${health.version})`);

    const { data: teams } = await client.get<{ data: Array<{ id: string }>}>('/teams');
    ok(`Teams: ${teams.length}`);

    if (teams.length > 0) {
      const teamId = teams[0].id;
      const { data: agents } = await client.get<{ data: Array<{ status: string }> }>(`/teams/${teamId}/agents`);
      const { data: tasks } = await client.get<{ data: Array<{ status: string }> }>(`/teams/${teamId}/tasks`);
      const { data: runs } = await client.get<{ data: unknown[] }>(`/teams/${teamId}/runs`);

      const running = agents.filter((a) => a.status === 'running').length;
      const openTasks = tasks.filter((t) => !['done', 'cancelled'].includes(t.status)).length;

      ok(`Agents: ${agents.length} (${running} running)`);
      ok(`Tasks: ${openTasks} open / ${tasks.length} total`);
      ok(`Runs: ${runs.length} total`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    fail(`Failed to connect: ${message}`);
    fail('Is the CCO server running? Start with: cco start');
  }
}
