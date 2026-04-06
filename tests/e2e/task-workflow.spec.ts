import { test, expect } from '@playwright/test';

test.describe('Task System E2E', () => {
  let teamId: string;
  let agentId: string;

  test('setup: create team and agent', async ({ request }) => {
    const teamRes = await request.post('/api/teams', {
      data: { name: 'Task Workflow Team', description: 'Task workflow tests' },
    });
    expect(teamRes.status()).toBe(201);
    const teamBody = await teamRes.json();
    teamId = teamBody.data.id;

    const agentRes = await request.post(`/api/teams/${teamId}/agents`, {
      data: { name: 'Checkout Agent', role: 'developer', adapterType: 'mock' },
    });
    expect(agentRes.status()).toBe(201);
    const agentBody = await agentRes.json();
    agentId = agentBody.data.id;
  });

  test('task lifecycle: backlog -> todo -> in_progress -> done', async ({ request }) => {
    const create = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'Lifecycle Task' },
    });
    expect(create.status()).toBe(201);
    const task = (await create.json()).data;
    expect(task.status).toBe('backlog');

    // backlog -> todo
    const toTodo = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'todo' },
    });
    expect(toTodo.status()).toBe(200);
    expect((await toTodo.json()).data.status).toBe('todo');

    // todo -> in_progress
    const toProgress = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'in_progress' },
    });
    expect((await toProgress.json()).data.status).toBe('in_progress');

    // in_progress -> done
    const toDone = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'done' },
    });
    const doneTask = (await toDone.json()).data;
    expect(doneTask.status).toBe('done');
    expect(doneTask.completedAt).toBeTruthy();
  });

  test('blocked status transition', async ({ request }) => {
    const create = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'Block Test' },
    });
    const task = (await create.json()).data;

    // Move to in_progress via todo
    await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'todo' },
    });
    await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'in_progress' },
    });

    // Block it
    const blocked = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'blocked' },
    });
    expect((await blocked.json()).data.status).toBe('blocked');

    // Resume
    const resumed = await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'in_progress' },
    });
    expect((await resumed.json()).data.status).toBe('in_progress');
  });

  test('search tasks by title', async ({ request }) => {
    await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'Unique Search Target XYZ' },
    });

    const res = await request.get(`/api/teams/${teamId}/tasks?q=XYZ`);
    const tasks = (await res.json()).data;
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(tasks.some((t: Record<string, string>) => t.title.includes('XYZ'))).toBe(true);
  });

  test('multi-status filter', async ({ request }) => {
    const res = await request.get(`/api/teams/${teamId}/tasks?status=backlog,todo`);
    const tasks = (await res.json()).data;
    for (const t of tasks) {
      expect(['backlog', 'todo']).toContain(t.status);
    }
  });

  test('identifier lookup', async ({ request }) => {
    const create = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'Identifier Test' },
    });
    const task = (await create.json()).data;

    const byId = await request.get(`/api/teams/${teamId}/tasks/${task.id}`);
    expect(byId.status()).toBe(200);

    const byIdentifier = await request.get(`/api/teams/${teamId}/tasks/${task.identifier}`);
    expect(byIdentifier.status()).toBe(200);
    expect((await byIdentifier.json()).data.id).toBe(task.id);
  });

  test('checkout and release', async ({ request }) => {
    // Create a task in todo status
    const create = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'Checkout Test' },
    });
    const task = (await create.json()).data;

    // Move to todo for checkout eligibility
    await request.patch(`/api/teams/${teamId}/tasks/${task.id}`, {
      data: { status: 'todo' },
    });

    // Checkout
    const checkout = await request.post(`/api/teams/${teamId}/tasks/${task.id}/checkout`, {
      data: { agentId },
    });
    expect(checkout.status()).toBe(200);
    const checkedOut = (await checkout.json()).data;
    expect(checkedOut.status).toBe('in_progress');
    expect(checkedOut.assigneeAgentId).toBe(agentId);

    // Double checkout should fail
    const doubleCheckout = await request.post(`/api/teams/${teamId}/tasks/${task.id}/checkout`, {
      data: { agentId },
    });
    expect(doubleCheckout.status()).toBe(400);

    // Release back to todo
    const release = await request.post(`/api/teams/${teamId}/tasks/${task.id}/release`, {
      data: { newStatus: 'todo' },
    });
    expect(release.status()).toBe(200);
    const released = (await release.json()).data;
    expect(released.status).toBe('todo');
    expect(released.checkoutRunId).toBeNull();
  });

  test('checkout requires agentId', async ({ request }) => {
    const create = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'No Agent Test' },
    });
    const task = (await create.json()).data;

    const res = await request.post(`/api/teams/${teamId}/tasks/${task.id}/checkout`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('project and origin filters', async ({ request }) => {
    // Filter by originKind — all manual tasks
    const res = await request.get(`/api/teams/${teamId}/tasks?originKind=manual`);
    expect(res.status()).toBe(200);
    const tasks = (await res.json()).data;
    for (const t of tasks) {
      expect(t.originKind).toBe('manual');
    }
  });

  test('create task with goal and billing code', async ({ request }) => {
    const res = await request.post(`/api/teams/${teamId}/tasks`, {
      data: {
        title: 'Billing Task',
        billingCode: 'PROJ-001',
        priority: 'high',
      },
    });
    expect(res.status()).toBe(201);
    const task = (await res.json()).data;
    expect(task.billingCode).toBe('PROJ-001');
    expect(task.priority).toBe('high');
  });
});
