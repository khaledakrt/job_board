import { expect, test } from '@playwright/test';
import { expectPageHealthy, loginAs } from './helpers/auth';

const ADMIN_PAGES = [
  { path: '/admin/dashboard', text: /administration|dashboard|tableau/i },
  { path: '/admin/users', text: /utilisateurs/i },
  { path: '/admin/jobs', text: /offres/i },
  { path: '/admin/training-centers', text: /centres de formation/i },
  { path: '/admin/private-institutions', text: /établissements privés|etablissements privés/i },
  { path: '/admin/private-institution-offerings', text: /publications établissements|publication/i },
  { path: '/admin/training-formations', text: /formations/i },
  { path: '/admin/training-events', text: /événements|evenements/i },
] as const;

test.describe('Admin protected pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  for (const pageSpec of ADMIN_PAGES) {
    test(`loads ${pageSpec.path}`, async ({ page }) => {
      await page.goto(pageSpec.path);

      await expect(page).toHaveURL(new RegExp(pageSpec.path.replace(/\//g, '\\/')));
      await expectPageHealthy(page);
      await expect(page.locator('body')).toContainText(pageSpec.text);
    });
  }
});
