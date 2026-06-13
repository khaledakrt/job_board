import { expect, test, type Page } from '@playwright/test';
import { expectWorkspaceReady, loginAs } from './helpers/auth';

type ApplicationTestStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

function mockRecruiterContext(page: Page): Promise<void> {
  return page.route('**/api/recruiter/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'recruiter-profile-test',
          userId: 'recruiter-user-test',
          jobTitle: 'Talent Manager',
          companyRole: 'owner',
          canPostJob: true,
          canDecideApplication: true,
          canEditCompany: true,
          company: {
            id: 'company-test',
            name: 'Acme Corp',
            logoUrl: null,
          },
        },
      }),
    });
  });
}

function mockRecruiterJobs(page: Page): Promise<void> {
  return page.route('**/api/recruiter/jobs**', async (route) => {
    const url = new URL(route.request().url());
    const archived = url.searchParams.get('archived') === 'true';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: archived
          ? []
          : [
              {
                id: 'job-test',
                title: 'Développeur Angular',
                status: 'active',
                location: 'Tunis',
                contractType: 'cdi',
                remoteType: 'hybrid',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
        pagination: {
          page: 1,
          limit: archived ? 20 : 100,
          totalItems: archived ? 0 : 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    });
  });
}

function applicationFixture(status: ApplicationTestStatus = 'applied') {
  return {
    id: 'application-test',
    jobId: 'job-test',
    candidateId: 'candidate-test',
    status,
    coverLetter: null,
    resumeSnapshotUrl: null,
    rating: null,
    interviewAt: null,
    archivedAt: status === 'rejected' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    job: {
      id: 'job-test',
      title: 'Développeur Angular',
      companyId: 'company-test',
    },
    candidate: {
      id: 'candidate-test',
      firstName: 'Jean',
      lastName: 'Candidat',
      professionalTitle: 'Développeur frontend',
      avatarUrl: null,
    },
  };
}

test.describe('ATS interview validation', () => {
  test('recruiter cannot move an application to interview without an interview date', async ({
    page,
  }) => {
    let statusPatchCalled = false;

    await loginAs(page, 'recruiter');
    await expectWorkspaceReady(page, '/recruiter/dashboard');

    await mockRecruiterContext(page);
    await mockRecruiterJobs(page);

    await page.route('**/api/applications**', async (route) => {
      if (route.request().method() === 'PATCH') {
        statusPatchCalled = true;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'PATCH should not be called' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [applicationFixture()],
          pagination: {
            page: 1,
            limit: 12,
            totalItems: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      });
    });

    await page.goto('/recruiter/ats');
    await page.getByRole('button', { name: 'Liste' }).click();
    await page.locator('.stage-select').first().selectOption('interview');

    await expect(page.getByRole('dialog', { name: /changer l’étape/i })).toBeVisible();
    await expect(page.locator('#statusInterviewAt')).toHaveValue('');
    await page.getByRole('button', { name: 'Confirmer' }).click();

    await expect(page.locator('.status-modal')).toContainText(
      'Choisissez la date et l’heure de l’entretien.'
    );
    await expect.poll(() => statusPatchCalled).toBe(false);
  });

  test('recruiter can reject an application, find it in archives, and restore it', async ({
    page,
  }) => {
    let rejected = false;
    let restored = false;
    let rejectedPayload: unknown = null;

    await loginAs(page, 'recruiter');
    await expectWorkspaceReady(page, '/recruiter/dashboard');

    await mockRecruiterContext(page);
    await mockRecruiterJobs(page);

    await page.route('**/api/applications**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'PATCH' && url.pathname.endsWith('/application-test/status')) {
        rejectedPayload = request.postDataJSON();
        rejected = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: applicationFixture('rejected'),
            meta: { emailSent: false },
          }),
        });
        return;
      }

      if (request.method() === 'PATCH' && url.pathname.endsWith('/application-test/restore')) {
        restored = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: applicationFixture('screening'),
          }),
        });
        return;
      }

      const archived = url.searchParams.get('archived') === 'true';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: archived ? (restored ? [] : [applicationFixture('rejected')]) : rejected ? [] : [applicationFixture()],
          pagination: {
            page: 1,
            limit: archived ? 20 : 12,
            totalItems: archived ? (restored ? 0 : 1) : rejected ? 0 : 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      });
    });

    await page.goto('/recruiter/ats');
    await page.getByRole('button', { name: 'Liste' }).click();
    await page.locator('.stage-select').first().selectOption('rejected');
    await expect(page.getByRole('dialog', { name: /changer l’étape/i })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer' }).click();

    await expect.poll(() => rejected).toBe(true);
    expect(rejectedPayload).toMatchObject({ status: 'rejected' });
    await expect(page.locator('body')).toContainText('Candidature rejetée et déplacée dans Archives.');

    await page.goto('/recruiter/archives');
    await expect(page.locator('body')).toContainText('Jean Candidat');
    await page.getByRole('button', { name: 'Restaurer' }).first().click();
    const restoreDialog = page.getByRole('alertdialog', { name: /restaurer la candidature/i });
    await expect(restoreDialog).toBeVisible();
    await restoreDialog.getByRole('button', { name: 'Restaurer' }).click();

    await expect.poll(() => restored).toBe(true);
    await expect(page.locator('body')).toContainText('Candidature restaurée dans l’ATS en Présélection.');
  });
});
