import { expect, test } from '@playwright/test';
import { expectPageHealthy, loginAs } from './helpers/auth';

const RECRUITER_PAGES = [
  { path: '/recruiter/dashboard', heading: /Acme Corp|tableau de bord recruteur/i },
  { path: '/recruiter/onboarding', heading: /profil entreprise/i },
  { path: '/recruiter/jobs', heading: /offres d'emploi/i },
  { path: '/recruiter/ats', heading: /suivi des candidatures/i },
  { path: '/recruiter/team', heading: /équipe|equipe/i },
  { path: '/recruiter/settings', heading: /paramètres/i },
] as const;

test.describe('Recruiter protected pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'recruiter');
    await expect(page).toHaveURL(/\/recruiter\/dashboard/);
  });

  for (const pageSpec of RECRUITER_PAGES) {
    test(`loads ${pageSpec.path}`, async ({ page }) => {
      await page.goto(pageSpec.path);

      await expect(page).toHaveURL(new RegExp(pageSpec.path.replace(/\//g, '\\/')));
      await expectPageHealthy(page);
      await expect(page.getByRole('heading', { name: pageSpec.heading }).first()).toBeVisible();
    });
  }
});
