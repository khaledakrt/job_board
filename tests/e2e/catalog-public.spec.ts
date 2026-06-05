import { expect, test } from '@playwright/test';
import { expectPageHealthy } from './helpers/auth';

const CATALOG_PAGES = [
  { path: '/centres-formation', text: /centres de formation|formation/i },
  { path: '/centres-formation/inscription', text: /inscrire|centre|formation/i },
  { path: '/etablissements-prives', text: /établissements privés|etablissements privés|établissement/i },
  { path: '/etablissements-prives/inscription', text: /inscrire|établissement|etablissement/i },
] as const;

test.describe('Public catalog pages', () => {
  for (const pageSpec of CATALOG_PAGES) {
    test(`loads ${pageSpec.path}`, async ({ page }) => {
      const response = await page.goto(pageSpec.path);

      expect(response?.ok()).toBeTruthy();
      await expectPageHealthy(page);
      await expect(page.locator('body')).toContainText(pageSpec.text);
    });
  }
});
