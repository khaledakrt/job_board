import { expect, test, type Page } from '@playwright/test';

const apiBaseURL = process.env.E2E_API_URL || 'https://tun-job-board.com/api';
const withRoleLogins = process.env.E2E_WITH_ROLE_LOGINS === 'true';

const publicRoutes = [
  { path: '/', expected: /tun job|emploi|candidat|recruteur/i },
  { path: '/offres', expected: /offres|emploi|recherche/i },
  { path: '/centres-formation', expected: /formation|centre/i },
  { path: '/etablissements-prives', expected: /établissement|etablissement|priv/i },
] as const;

const roleUsers = [
  {
    role: 'candidate',
    email: process.env.TEST_CANDIDATE_EMAIL,
    password: process.env.TEST_PASSWORD,
    expectedPath: /\/candidate\/dashboard/,
    healthyRoute: '/candidate/dashboard',
  },
  {
    role: 'recruiter',
    email: process.env.TEST_RECRUITER_EMAIL,
    password: process.env.TEST_PASSWORD,
    expectedPath: /\/recruiter\/dashboard/,
    healthyRoute: '/recruiter/dashboard',
  },
  {
    role: 'admin',
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_PASSWORD,
    expectedPath: /\/admin\/dashboard/,
    healthyRoute: '/admin/dashboard',
  },
] as const;

async function expectPageHealthy(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toContainText('Base de données non à jour');
  await expect(page.locator('body')).not.toContainText('Service Unavailable');
  await expect(page.locator('body')).not.toContainText('Cannot GET');
  await expect(page.locator('body')).not.toContainText('Erreur serveur');
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
}

test.describe('Production smoke checks', () => {
  test('API health is OK', async ({ request }) => {
    const response = await request.get(`${apiBaseURL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  for (const route of publicRoutes) {
    test(`public route loads: ${route.path}`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.ok(), `${route.path} should return 2xx`).toBeTruthy();
      await expectPageHealthy(page);
      await expect(page.locator('body')).toContainText(route.expected);
    });
  }

  test('anonymous users are redirected from protected workspaces', async ({ page }) => {
    await page.goto('/candidate/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto('/recruiter/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  for (const user of roleUsers) {
    test(`role login works: ${user.role}`, async ({ page }) => {
      test.skip(!withRoleLogins, 'Set E2E_WITH_ROLE_LOGINS=true in tests/e2e/prod.env to enable role login checks.');
      test.skip(!user.email || !user.password, `Missing ${user.role} credentials in tests/e2e/prod.env.`);

      await login(page, user.email!, user.password!);
      await expect(page).toHaveURL(user.expectedPath);

      await page.goto(user.healthyRoute);
      await expectPageHealthy(page);
    });
  }
});
