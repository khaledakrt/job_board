import { expect, test } from '@playwright/test';
import { expectPageHealthy } from './helpers/auth';

test.describe('Public job search', () => {
  test('loads the job search and can open a job detail when jobs exist', async ({ page }) => {
    await page.goto('/offres');

    await expectPageHealthy(page);
    await expect(page.locator('body')).toContainText(/offres|recherche|emploi/i);

    const firstJobLink = page.locator('a[href^="/offres/"]').first();
    if (await firstJobLink.count()) {
      await firstJobLink.click();
      await expect(page).toHaveURL(/\/offres\/.+/);
      await expectPageHealthy(page);
      await expect(page.locator('body')).toContainText(/postuler|entreprise|contrat|offre/i);
    }
  });
});
