import { expect, test } from '@playwright/test';
import { PUBLIC_ROUTES } from '../fixtures/routes';

test.describe('Public pages', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      const response = await page.goto(route);

      expect(response?.ok(), `${route} should respond with 2xx`).toBeTruthy();
      await expect(page.locator('body')).not.toContainText('Base de données non à jour');
      await expect(page.locator('body')).not.toContainText('Service Unavailable');
      await expect(page.locator('body')).not.toContainText('Cannot GET');
    });
  }
});
