import { expect, test, type Page } from '@playwright/test';

const candidateEmail = process.env.TEST_CANDIDATE_EMAIL;
const candidatePassword = process.env.TEST_CANDIDATE_PASSWORD || process.env.TEST_PASSWORD;

function hasCandidateCredentials(): boolean {
  return Boolean(candidateEmail && candidatePassword);
}

async function expectPageHealthy(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toContainText('Base de données non à jour');
  await expect(page.locator('body')).not.toContainText('Service Unavailable');
  await expect(page.locator('body')).not.toContainText('Cannot GET');
  await expect(page.locator('body')).not.toContainText('Erreur serveur');
}

async function loginCandidate(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('#email').fill(candidateEmail!);
  await page.locator('#password').fill(candidatePassword!);
  await page.getByRole('button', { name: /se connecter|sign in|login/i }).click();
  await expect(page).toHaveURL(/\/candidate\/dashboard/);
}

test.describe('Candidate E2E - jobs, candidatures, favoris et notifications', () => {
  test.beforeEach(() => {
    test.skip(
      !hasCandidateCredentials(),
      'Fill TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD in tests/e2e/prod.env.'
    );
  });

  test('recherche emploi affiche filtres, alerte et actions candidat', async ({ page }) => {
    await loginCandidate(page);
    await page.goto('/candidate/jobs');
    await expectPageHealthy(page);

    await expect(page.locator('body')).toContainText(/Recherche|emploi|Filtres|alerte|Postuler/i);
    await expect(page.getByRole('button', { name: /Créer une alerte|Create alert/i })).toBeVisible();

    const inputs = page.locator('.public-jobs-input');
    await expect(inputs.first()).toBeVisible();
    await inputs.first().fill('Angular');
    await page.getByRole('button', { name: /Rechercher|Search/i }).click();
    await expectPageHealthy(page);
  });

  test('dashboard candidat affiche suivi, filtres candidatures et sections associees', async ({ page }) => {
    await loginCandidate(page);
    await page.goto('/candidate/dashboard');
    await expectPageHealthy(page);

    await expect(page.locator('body')).toContainText(/Candidatures|Suivi|Entretien|Offres enregistrées|Alertes emploi/i);
    await expect(page.getByRole('button', { name: /Actives|Active/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Archivées|Archived/i })).toBeVisible();
    await expect(page.locator('.apps-search')).toBeVisible();
  });

  test('saved page separe offres enregistrees et alertes emploi', async ({ page }) => {
    await loginCandidate(page);
    await page.goto('/candidate/saved');
    await expectPageHealthy(page);

    await expect(page.locator('body')).toContainText(/Offres|Alertes|emploi/i);
    await page.getByRole('button', { name: /Alertes|Alerts/i }).click();
    await expect(page.locator('body')).toContainText(/Alerte|active|pause|critères|aucune/i);
  });

  test('notification bell candidat ouvre panneau et detail sans casser le dashboard', async ({ page }) => {
    await loginCandidate(page);
    await page.goto('/candidate/dashboard');
    await expectPageHealthy(page);

    await page.getByRole('button', { name: /Notifications/i }).click();
    await expect(page.locator('[role="dialog"][aria-label="Notifications candidat"]')).toBeVisible();
    await expect(page.locator('body')).toContainText(/Notifications|Aucune notification|Voir mon suivi/i);
  });
});
