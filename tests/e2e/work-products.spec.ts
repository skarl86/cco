import { test, expect } from '@playwright/test';

test.describe('Work Products E2E', () => {
  let teamId: string;
  let taskId: string;

  test('setup: create team and task', async ({ request }) => {
    const teamRes = await request.post('/api/teams', {
      data: { name: 'WP Test Team', description: 'Work products tests' },
    });
    expect(teamRes.status()).toBe(201);
    teamId = (await teamRes.json()).data.id;

    const taskRes = await request.post(`/api/teams/${teamId}/tasks`, {
      data: { title: 'WP Test Task' },
    });
    expect(taskRes.status()).toBe(201);
    taskId = (await taskRes.json()).data.id;
  });

  test('create and list work products', async ({ request }) => {
    const res = await request.post(`/api/teams/${teamId}/tasks/${taskId}/work-products`, {
      data: {
        type: 'pull_request',
        provider: 'github',
        title: 'PR #1',
        externalId: '1',
        url: 'https://github.com/test/1',
      },
    });
    expect(res.status()).toBe(201);
    const wp = (await res.json()).data;
    expect(wp.type).toBe('pull_request');

    const list = await request.get(`/api/teams/${teamId}/tasks/${taskId}/work-products`);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(1);
  });

  test('primary product demotion', async ({ request }) => {
    await request.post(`/api/teams/${teamId}/tasks/${taskId}/work-products`, {
      data: { type: 'commit', provider: 'local', title: 'Commit A', isPrimary: true },
    });
    await request.post(`/api/teams/${teamId}/tasks/${taskId}/work-products`, {
      data: { type: 'commit', provider: 'local', title: 'Commit B', isPrimary: true },
    });

    const list = await request.get(`/api/teams/${teamId}/tasks/${taskId}/work-products`);
    const commits = (await list.json()).data.filter((w: any) => w.type === 'commit');
    const primaries = commits.filter((w: any) => w.isPrimary === 1);
    expect(primaries.length).toBe(1);
    expect(primaries[0].title).toBe('Commit B');
  });

  test('update review state', async ({ request }) => {
    const create = await request.post(`/api/teams/${teamId}/tasks/${taskId}/work-products`, {
      data: {
        type: 'pull_request',
        provider: 'github',
        title: 'Review Test PR',
        reviewState: 'needs_review',
      },
    });
    const wp = (await create.json()).data;

    const update = await request.patch(`/api/teams/${teamId}/work-products/${wp.id}`, {
      data: { reviewState: 'approved' },
    });
    expect((await update.json()).data.reviewState).toBe('approved');
  });

  test('delete work product', async ({ request }) => {
    const create = await request.post(`/api/teams/${teamId}/tasks/${taskId}/work-products`, {
      data: { type: 'artifact', provider: 'local', title: 'Temp Report' },
    });
    const wp = (await create.json()).data;

    const del = await request.delete(`/api/teams/${teamId}/work-products/${wp.id}`);
    expect(del.status()).toBe(204);

    const get = await request.get(`/api/teams/${teamId}/work-products/${wp.id}`);
    expect(get.status()).toBe(404);
  });
});
