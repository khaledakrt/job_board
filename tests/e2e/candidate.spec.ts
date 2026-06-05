import { expect, test } from '@playwright/test';
import { loginAs, expectWorkspaceReady } from './helpers/auth';

test.describe('Candidate workspace', () => {
  test('candidate can sign in and reach the dashboard', async ({ page }) => {
    await loginAs(page, 'candidate');

    await expectWorkspaceReady(page, '/candidate/dashboard');
    await expect(page.locator('body')).toContainText(/candidat|dashboard|tableau/i);
  });
});
