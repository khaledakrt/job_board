import { expect, test } from '@playwright/test';

test.describe('Authentication pages', () => {
  test('login page renders the required fields', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('register page renders candidate and recruiter choices', async ({ page }) => {
    await page.goto('/auth/register');

    await expect(page.getByRole('button', { name: /candidate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /company owner/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });
});
