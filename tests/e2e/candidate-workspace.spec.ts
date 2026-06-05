import { expect, test } from '@playwright/test';
import { expectPageHealthy, loginAs } from './helpers/auth';

const CANDIDATE_PAGES = [
  { path: '/candidate/dashboard', text: /candidature|suivi|dashboard|tableau/i },
  { path: '/candidate/jobs', text: /offres|recherche|postuler/i },
  { path: '/candidate/saved', text: /favoris|enregistr/i },
  { path: '/candidate/profile', text: /profil|compétences|cv/i },
  { path: '/candidate/settings', text: /paramètres|mot de passe/i },
] as const;

test.describe('Candidate protected pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'candidate');
    await expect(page).toHaveURL(/\/candidate\/dashboard/);
  });

  for (const pageSpec of CANDIDATE_PAGES) {
    test(`loads ${pageSpec.path}`, async ({ page }) => {
      await page.goto(pageSpec.path);

      await expect(page).toHaveURL(new RegExp(pageSpec.path.replace(/\//g, '\\/')));
      await expectPageHealthy(page);
      await expect(page.locator('body')).toContainText(pageSpec.text);
    });
  }
});
