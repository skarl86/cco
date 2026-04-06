const API_URL = process.env.CCO_API_URL ?? 'http://localhost:3100/api';

async function fetchJson(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function showStatus(): Promise<void> {
  try {
    const health = await fetchJson('/health');
    console.log(`Server: ${health.status} (v${health.version})`);

    const { data: teams } = await fetchJson('/teams');
    console.log(`Teams: ${teams.length}`);

    if (teams.length > 0) {
      const teamId = teams[0].id;
      const { data: agents } = await fetchJson(`/teams/${teamId}/agents`);
      const { data: tasks } = await fetchJson(`/teams/${teamId}/tasks`);
      const { data: runs } = await fetchJson(`/teams/${teamId}/runs`);

      const running = agents.filter((a: any) => a.status === 'running').length;
      const openTasks = tasks.filter((t: any) => !['done', 'cancelled'].includes(t.status)).length;

      console.log(`Agents: ${agents.length} (${running} running)`);
      console.log(`Tasks: ${openTasks} open / ${tasks.length} total`);
      console.log(`Runs: ${runs.length} total`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to connect: ${message}`);
    console.error('Is the CCO server running? Start with: cco start');
  }
}
