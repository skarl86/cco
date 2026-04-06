import { test, expect } from '@playwright/test';

test.describe('Full API Workflow', () => {
  let teamId: string;
  let agentId: string;

  test('create a team', async ({ request }) => {
    const res = await request.post('/api/teams', {
      data: { name: 'E2E Team', description: 'End-to-end test team' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    teamId = body.data.id;
    expect(body.data.name).toBe('E2E Team');
  });

  test('create an agent', async ({ request }) => {
    const res = await request.post(`/api/teams/${teamId}/agents`, {
      data: { name: 'E2E Agent', role: 'developer', adapterType: 'mock' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    agentId = body.data.id;
    expect(body.data.role).toBe('developer');
  });

  test('list agents', async ({ request }) => {
    const res = await request.get(`/api/teams/${teamId}/agents`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBe(1);
  });

  test('create a task', async ({ request }) => {
    const res = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'E2E Task', description: 'Test task', priority: 'high' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.identifier).toMatch(/^CCO-\d+$/);
    expect(body.data.priority).toBe('high');
  });

  test('run an agent', async ({ request }) => {
    const res = await request.post(`/api/teams/${teamId}/agents/${agentId}/run`, {
      data: { prompt: 'E2E test prompt' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.status).toBe('completed');
    expect(body.data.runId).toBeDefined();
  });

  test('list runs', async ({ request }) => {
    const res = await request.get(`/api/teams/${teamId}/runs`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].status).toBe('completed');
  });

  test('create and decide an approval', async ({ request }) => {
    const createRes = await request.post(`/api/teams/${teamId}/approvals`, {
      data: {
        type: 'code_review',
        requestedByAgentId: agentId,
        payload: { summary: 'Review my code' },
      },
    });
    expect(createRes.status()).toBe(201);
    const { data: approval } = await createRes.json();

    const decideRes = await request.post(`/api/teams/${teamId}/approvals/${approval.id}/decide`, {
      data: { decision: 'approved', note: 'LGTM' },
    });
    expect(decideRes.ok()).toBeTruthy();
    const { data: decided } = await decideRes.json();
    expect(decided.status).toBe('approved');
  });

  test('create a routine and trigger it', async ({ request }) => {
    const createRes = await request.post(`/api/teams/${teamId}/routines`, {
      data: {
        title: 'Daily check',
        assigneeAgentId: agentId,
        cronExpression: '0 9 * * *',
      },
    });
    expect(createRes.status()).toBe(201);
    const { data: routine } = await createRes.json();

    const triggerRes = await request.post(`/api/teams/${teamId}/routines/${routine.id}/trigger`);
    expect(triggerRes.status()).toBe(201);
    const { data: task } = await triggerRes.json();
    expect(task.title).toContain('Daily check');
    expect(task.originKind).toBe('routine');
  });

  test('create a project', async ({ request }) => {
    const res = await request.post(`/api/teams/${teamId}/projects`, {
      data: {
        name: 'E2E Project',
        repoPath: '/tmp/e2e-test',
        baseBranch: 'main',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('E2E Project');
  });

  test('add a comment to task', async ({ request }) => {
    // Get tasks
    const tasksRes = await request.get(`/api/teams/${teamId}/tasks`);
    const { data: tasks } = await tasksRes.json();
    const taskId = tasks[0].id;

    const res = await request.post(`/api/teams/${teamId}/tasks/${taskId}/comments`, {
      data: { body: 'E2E comment test', authorType: 'user' },
    });
    expect(res.status()).toBe(201);

    const listRes = await request.get(`/api/teams/${teamId}/tasks/${taskId}/comments`);
    const { data: comments } = await listRes.json();
    expect(comments.length).toBeGreaterThanOrEqual(1);
  });

  test('task status transitions', async ({ request }) => {
    // Create task
    const createRes = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'Transition test' },
    });
    const { data: task } = await createRes.json();

    // default status is now 'todo', go straight to in_progress
    // todo → in_progress
    let res = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'in_progress' },
    });
    expect(res.ok()).toBeTruthy();

    // in_progress → backlog (invalid!)
    res = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'backlog' },
    });
    expect(res.status()).toBe(400);

    // in_progress → in_review → done
    res = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'in_review' },
    });
    expect(res.ok()).toBeTruthy();

    res = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'done' },
    });
    expect(res.ok()).toBeTruthy();
    const { data: done } = await res.json();
    expect(done.completedAt).toBeGreaterThan(0);
  });
});
