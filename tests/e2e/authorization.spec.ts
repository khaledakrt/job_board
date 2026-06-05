import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Authorization guards', () => {
  test('anonymous user is redirected to login from protected workspaces', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto('/candidate/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto('/recruiter/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('candidate cannot access admin or recruiter workspaces', async ({ page }) => {
    await loginAs(page, 'candidate');
    await expect(page).toHaveURL(/\/candidate\/dashboard/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/recruiter/dashboard');
    await expect(page).toHaveURL(/\/$/);
  });
});
