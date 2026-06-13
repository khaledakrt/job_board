import { expect, request, test, type APIRequestContext } from '@playwright/test';
import { TEST_PASSWORD, TEST_USERS } from '../fixtures/users';

const API_URL = `${process.env.E2E_API_URL || 'http://localhost:3000/api'}`.replace(/\/+$/, '') + '/';
const ALLOW_MUTATING_E2E = process.env.E2E_ALLOW_MUTATIONS === 'true';

function assertSafeMutationTarget(): void {
  const hostname = new URL(API_URL).hostname.toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  if (!isLocal && !ALLOW_MUTATING_E2E) {
    throw new Error(
      `Refusing to run mutating subscription e2e tests against ${API_URL}. ` +
        'Use a local/staging database or set E2E_ALLOW_MUTATIONS=true explicitly.'
    );
  }
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type AdminUserDetail = {
  id: string;
  email: string;
  recruiterProfile?: {
    companyId?: string;
    companyName?: string;
  } | null;
};

type Job = {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'hidden' | 'expired';
};

async function loginApi(email: string, password = TEST_PASSWORD): Promise<string> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post('auth/login', { data: { email, password } });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
  await ctx.dispose();
  return body.data.accessToken;
}

async function apiContext(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@test.com`;
}

function futureDate(days = 45): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function jobPayload(status: 'draft' | 'active', title: string) {
  return {
    title,
    description:
      'Description complete pour valider le workflow publication abonnement multi entreprise.',
    requirements: 'Experience professionnelle pertinente.',
    remoteType: 'hybrid',
    contractType: 'CDI',
    location: 'Tunis',
    expiresAt: futureDate(),
    status,
  };
}

async function createRecruiter(
  admin: APIRequestContext,
  companyName: string
): Promise<{ email: string; companyId: string }> {
  const email = uniqueEmail('subscription-recruiter');
  const res = await admin.post('admin/users', {
    data: {
      email,
      password: TEST_PASSWORD,
      role: 'recruiter',
      isVerified: true,
      companyName,
      companyIndustry: 'Tests',
      jobTitle: 'Responsable RH',
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as ApiResponse<AdminUserDetail>;
  const companyId = body.data.recruiterProfile?.companyId;
  expect(companyId, `companyId missing for ${companyName}`).toBeTruthy();
  return { email, companyId: companyId! };
}

async function createJob(
  recruiter: APIRequestContext,
  status: 'draft' | 'active',
  title: string
): Promise<Job> {
  const res = await recruiter.post('recruiter/jobs', { data: jobPayload(status, title) });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as ApiResponse<Job>;
  return body.data;
}

test.describe('Subscription publication business rules', () => {
  test.beforeAll(() => {
    assertSafeMutationTarget();
  });

  test('paid mode blocks only new publications and never hides already active jobs', async () => {
    const adminToken = await loginApi(TEST_USERS.admin.email, TEST_USERS.admin.password);
    const admin = await apiContext(adminToken);

    await test.step('prepare free mode and two companies', async () => {
      const policy = await admin.patch('admin/subscription-policy', {
        data: { mode: 'free_all' },
      });
      expect(policy.ok(), await policy.text()).toBeTruthy();
    });

    const unpaidCompany = await createRecruiter(admin, `Unpaid Company ${Date.now()}`);
    const paidCompany = await createRecruiter(admin, `Paid Company ${Date.now()}`);

    const unpaidToken = await loginApi(unpaidCompany.email);
    const paidToken = await loginApi(paidCompany.email);
    const unpaidRecruiter = await apiContext(unpaidToken);
    const paidRecruiter = await apiContext(paidToken);

    const alreadyPublished = await createJob(
      unpaidRecruiter,
      'active',
      `Already public ${Date.now()}`
    );
    expect(alreadyPublished.status).toBe('active');

    await test.step('switch back to paid mode without touching existing active jobs', async () => {
      const policy = await admin.patch('admin/subscription-policy', {
        data: { mode: 'paid_required' },
      });
      expect(policy.ok(), await policy.text()).toBeTruthy();

      const listed = await unpaidRecruiter.get('recruiter/jobs');
      expect(listed.ok(), await listed.text()).toBeTruthy();
      const body = (await listed.json()) as ApiResponse<Job[]>;
      expect(body.data.find((job) => job.id === alreadyPublished.id)?.status).toBe('active');
    });

    await test.step('unpaid company can save drafts but cannot publish new jobs', async () => {
      const draft = await createJob(unpaidRecruiter, 'draft', `Draft allowed ${Date.now()}`);
      expect(draft.status).toBe('draft');

      const activeCreate = await unpaidRecruiter.post('recruiter/jobs', {
        data: jobPayload('active', `Blocked active ${Date.now()}`),
      });
      expect(activeCreate.status()).toBe(403);
      await expect(activeCreate.json()).resolves.toMatchObject({
        message: 'An active company subscription is required to publish this job',
      });

      const activePatch = await unpaidRecruiter.patch(`recruiter/jobs/${draft.id}/status`, {
        data: { status: 'active' },
      });
      expect(activePatch.status()).toBe(403);
      await expect(activePatch.json()).resolves.toMatchObject({
        message: 'An active company subscription is required to publish this job',
      });
    });

    await test.step('paid company can publish while another company stays blocked', async () => {
      const sub = await admin.patch(`admin/companies/${paidCompany.companyId}/subscription`, {
        data: { action: 'activate_manual', months: 12 },
      });
      expect(sub.ok(), await sub.text()).toBeTruthy();

      const active = await createJob(paidRecruiter, 'active', `Paid active ${Date.now()}`);
      expect(active.status).toBe('active');
    });

    await Promise.all([admin.dispose(), unpaidRecruiter.dispose(), paidRecruiter.dispose()]);
  });
});
