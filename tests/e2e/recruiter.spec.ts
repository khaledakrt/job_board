import { expect, test } from '@playwright/test';
import { loginAs, expectWorkspaceReady } from './helpers/auth';

test.describe('Recruiter workspace', () => {
  test('recruiter can sign in and reach the dashboard', async ({ page }) => {
    await loginAs(page, 'recruiter');

    await expectWorkspaceReady(page, '/recruiter/dashboard');
    await expect(page.getByText('Console recruteur')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entreprise' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Offres', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Candidatures (ATS)' })).toBeVisible();
  });
});
