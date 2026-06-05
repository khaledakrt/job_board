import { expect, test } from '@playwright/test';
import { loginAs, expectWorkspaceReady } from './helpers/auth';

test.describe('Admin workspace', () => {
  test('admin can sign in and reach the dashboard', async ({ page }) => {
    await loginAs(page, 'admin');

    await expectWorkspaceReady(page, '/admin/dashboard');
    await expect(page.locator('body')).toContainText(/admin|utilisateurs|dashboard|tableau/i);
  });
});
