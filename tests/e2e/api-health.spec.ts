import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(body.database).toBe('connected');
  });
});
