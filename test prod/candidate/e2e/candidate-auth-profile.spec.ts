import { expect, test, type Page } from '@playwright/test';

const candidateEmail = process.env.TEST_CANDIDATE_EMAIL;
const candidatePassword = process.env.TEST_CANDIDATE_PASSWORD || process.env.TEST_PASSWORD;
const allowMutations = process.env.E2E_ALLOW_CANDIDATE_MUTATIONS === 'true';
const signupInbox = process.env.TEST_CANDIDATE_SIGNUP_INBOX;

function uniqueEmail(prefix: string): string {
  if (signupInbox) {
    const [localPart, domain] = signupInbox.split('@');
    if (localPart && domain) {
      return `${localPart}+${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@${domain}`;
    }
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@tun-job-board-test.com`;
}

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
  if (!candidateEmail || !candidatePassword) {
    throw new Error('Missing candidate credentials');
  }

  await page.goto('/auth/login');
  await page.locator('#email').fill(candidateEmail);
  await page.locator('#password').fill(candidatePassword);
  await page.getByRole('button', { name: /se connecter|sign in|login/i }).click();
  await expect(page).toHaveURL(/\/candidate\/dashboard/);
  await expectPageHealthy(page);
}

test.describe('Candidate E2E - inscription et verification email', () => {
  test('inscription candidat valide les mots de passe faibles et confirmations differentes', async ({
    page,
  }) => {
    await page.goto('/auth/register?role=candidate');

    await page.locator('#email').fill(uniqueEmail('candidate-validation'));
    await page.locator('#password').fill('weak');
    await page.locator('#confirmPassword').fill('different');
    await page.getByRole('button', { name: /creer un compte|créer un compte|create account/i }).click();

    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('body')).toContainText(/mot de passe|password|majuscule|8/i);
  });

  test('creation reelle candidat cree un compte non verifie puis bloque le login', async ({ page }) => {
    test.skip(
      !allowMutations,
      'Set E2E_ALLOW_CANDIDATE_MUTATIONS=true to create real candidate accounts.'
    );

    const email = uniqueEmail('candidate');
    const password = process.env.TEST_ACCOUNT_CREATION_PASSWORD || 'Test1234!';
    console.log(`Candidate signup email: ${email}`);

    await page.goto('/auth/register?role=candidate');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.getByRole('button', { name: /creer un compte|créer un compte|create account/i }).click();
    await expect(page.locator('body')).toContainText(/verify|vérif|confirmation|confirmer/i);

    await page.goto('/auth/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /se connecter|sign in|login/i }).click();
    await expect(page.locator('body')).toContainText(/confirmée|confirmation|verify|vérif/i);
  });

  test('verification email par token fonctionne si un token de recette est fourni', async ({ page }) => {
    const token = process.env.TEST_CANDIDATE_VERIFY_TOKEN;
    test.skip(!token, 'Set TEST_CANDIDATE_VERIFY_TOKEN when you can read the verification email.');

    await page.goto(`/auth/verify-email?token=${encodeURIComponent(token!)}`);
    await expect(page.locator('body')).toContainText(/confirmée|connecter|verified|success/i);
  });
});

test.describe('Candidate E2E - espace, profil, CV et parametres', () => {
  test.beforeEach(() => {
    test.skip(
      !hasCandidateCredentials(),
      'Fill TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD in tests/e2e/prod.env.'
    );
  });

  test('candidate ouvre toutes ses pages principales sans erreur serveur', async ({ page }) => {
    await loginCandidate(page);

    const routes = [
      '/candidate/dashboard',
      '/candidate/jobs',
      '/candidate/saved',
      '/candidate/profile',
      '/candidate/settings',
      '/candidate/annuaire-societes',
      '/candidate/annuaire-formations',
      '/candidate/annuaire-etablissements',
    ];

    for (const route of routes) {
      await page.goto(route);
      await expectPageHealthy(page);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('profil candidat expose identite, photo, experience, formation et generation PDF', async ({
    page,
  }) => {
    await loginCandidate(page);
    await page.goto('/candidate/profile');

    await expect(page.locator('body')).toContainText(/Profil candidat|CV et identité/i);
    await expect(page.getByText(/Photo affichée sur le CV PDF/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuer/i })).toBeVisible();

    await page.getByRole('button', { name: /Continuer/i }).click();
    await expect(page.locator('body')).toContainText(/Expérience professionnelle/i);

    await page.getByRole('button', { name: /Continuer/i }).click();
    await expect(page.locator('body')).toContainText(/Formation/i);

    await page.getByRole('button', { name: /Continuer/i }).click();
    await expect(page.locator('body')).toContainText(/Préférences|Langues|Certifications/i);
    await expect(page.getByRole('button', { name: /Enregistrer et générer mon CV PDF/i })).toBeVisible();
  });

  test('settings candidat valide email et mot de passe sans mutation', async ({ page }) => {
    await loginCandidate(page);
    await page.goto('/candidate/settings');

    await page.locator('#newEmail').fill('new-candidate@test.com');
    await page.locator('#confirmNewEmail').fill('different-candidate@test.com');
    await page.locator('#emailCurrentPassword').fill(candidatePassword!);
    await page.getByRole('button', { name: /Mettre à jour l’e-mail|Mettre a jour l'e-mail/i }).click();
    await expect(page.locator('body')).toContainText(/ne correspondent pas/i);

    await page.locator('#currentPassword').fill(candidatePassword!);
    await page.locator('#newPassword').fill('Weak1!');
    await page.locator('#confirmPassword').fill('Different123!');
    await page.getByRole('button', { name: /Mettre à jour le mot de passe/i }).click();
    await expect(page.locator('body')).toContainText(/mot de passe|critères|correspondent/i);
  });
});
