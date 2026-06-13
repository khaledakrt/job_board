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

  test('catalog list items can open detail pages when published entries exist', async ({ page }) => {
    for (const path of ['/centres-formation', '/etablissements-prives']) {
      await page.goto(path);
      await expectPageHealthy(page);

      const detailLink = page.locator(`a[href^="${path}/"]:not([href$="/inscription"])`).first();
      if (!(await detailLink.count())) continue;

      await detailLink.click();
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}/.+`));
      await expectPageHealthy(page);
      await expect(page.locator('body')).toContainText(/contact|description|formation|établissement|etablissement/i);
    }
  });
});
