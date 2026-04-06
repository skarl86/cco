import { test, expect } from '@playwright/test';

test.describe('UI Dashboard', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/teams', {
      data: { name: 'UI Test Team' },
    });
  });

  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('CCO');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('navigates to agents page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Agents' }).click();
    await expect(page).toHaveURL('/agents');
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible();
  });

  test('navigates to tasks page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page).toHaveURL('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  });

  test('navigates to runs page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Runs' }).click();
    await expect(page).toHaveURL('/runs');
    await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();
  });

  test('navigates to settings page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
