import { expect, Page } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/users';

type TestRole = keyof typeof TEST_USERS;

export async function loginAs(page: Page, role: TestRole): Promise<void> {
  const user = TEST_USERS[role];

  await page.goto('/auth/login');
  await page.getByLabel('Adresse e-mail').fill(user.email);
  await page.getByLabel('Mot de passe').fill(user.password);
  await page.getByRole('button', { name: /se connecter/i }).click();
}

export async function expectWorkspaceReady(page: Page, expectedPath: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(expectedPath.replace(/\//g, '\\/')));
  await expectPageHealthy(page);
}

export async function expectPageHealthy(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toContainText('Base de données non à jour');
  await expect(page.locator('body')).not.toContainText('Service Unavailable');
  await expect(page.locator('body')).not.toContainText('Cannot GET');
  await expect(page.locator('body')).not.toContainText('Erreur serveur');
}
