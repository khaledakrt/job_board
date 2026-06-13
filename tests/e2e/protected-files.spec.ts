import { expect, test } from '@playwright/test';
import { expectWorkspaceReady, loginAs } from './helpers/auth';

const MOCK_RESUME_URL = 'http://localhost:3000/uploads/resumes/generated-test.pdf';

test.describe('Protected file opening', () => {
  test('candidate PDF link opens the protected resume instead of staying blank', async ({ page }) => {
    await loginAs(page, 'candidate');
    await expectWorkspaceReady(page, '/candidate/dashboard');

    await page.route('**/api/candidate/profile', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'candidate-profile-test',
            userId: 'candidate-user-test',
            email: 'candidate@test.com',
            firstName: 'Jeann',
            lastName: 'Candidat',
            phone: '+21600000000',
            avatarUrl: null,
            professionalTitle: 'Développeur',
            bio: 'Profil candidat de test pour vérifier l’ouverture PDF.',
            skills: ['Angular', 'Node.js'],
            languages: [],
            certifications: [],
            linkedinUrl: null,
            portfolioUrl: null,
            experiences: [],
            education: [],
            resumeUrl: MOCK_RESUME_URL,
            minSalary: null,
            jobPreferences: null,
            notificationPreferences: null,
            onboardingCompletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route('**/api/uploads/resumes/generated-test.pdf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF',
      });
    });

    await page.goto('/candidate/profile');
    await expect(page.getByRole('link', { name: /voir mon cv pdf/i })).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: /voir mon cv pdf/i }).click();
    const popup = await popupPromise;

    const frame = popup.locator('iframe[title="CV PDF"]');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('src', /^blob:/);
  });
});
