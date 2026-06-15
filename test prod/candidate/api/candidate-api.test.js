'use strict';

const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const request = require('supertest');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), process.env.E2E_ENV_FILE || 'tests/e2e/prod.env'));

const API_URL = (process.env.E2E_API_URL || 'https://tun-job-board.com/api').replace(/\/+$/, '');
const api = request(API_URL);
const candidateEmail = process.env.TEST_CANDIDATE_EMAIL;
const candidatePassword = process.env.TEST_CANDIDATE_PASSWORD || process.env.TEST_PASSWORD;
const allowMutations = process.env.E2E_ALLOW_CANDIDATE_MUTATIONS === 'true';
const signupInbox = process.env.TEST_CANDIDATE_SIGNUP_INBOX;

function uniqueEmail(prefix) {
  if (signupInbox) {
    const [localPart, domain] = signupInbox.split('@');
    if (localPart && domain) {
      return `${localPart}+${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@${domain}`;
    }
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@tun-job-board-test.com`;
}

async function loginCandidate() {
  if (!candidateEmail || !candidatePassword) {
    throw new Error('Missing TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD');
  }

  const response = await api
    .post('/auth/login')
    .send({ email: candidateEmail, password: candidatePassword });

  expect(response.status).toBe(200);
  expect(response.body?.data?.accessToken).toEqual(expect.any(String));
  expect(response.body?.data?.user?.role).toBe('candidate');
  return response.body.data.accessToken;
}

describe('Candidate API - auth and access control', () => {
  test('rejects invalid candidate login', async () => {
    const response = await api
      .post('/auth/login')
      .send({ email: `missing-${Date.now()}@test.com`, password: 'WrongPassword123!' });

    expect(response.status).toBe(401);
  });

  test('validates candidate registration password strength without creating account', async () => {
    const response = await api
      .post('/auth/register')
      .send({ email: uniqueEmail('weak-candidate'), password: 'weak', role: 'candidate' });

    expect(response.status).toBe(400);
  });

  test('registration creates an unverified candidate and login is blocked until email verification', async () => {
    if (!allowMutations) {
      console.warn('Skipped: set E2E_ALLOW_CANDIDATE_MUTATIONS=true to create real candidate accounts.');
      return;
    }

    const email = uniqueEmail('candidate');
    const password = process.env.TEST_ACCOUNT_CREATION_PASSWORD || 'Test1234!';
    console.log(`Candidate signup email: ${email}`);

    const register = await api.post('/auth/register').send({ email, password, role: 'candidate' });
    expect(register.status).toBe(201);
    expect(register.body.data).toMatchObject({ email, role: 'candidate', isVerified: false });

    const login = await api.post('/auth/login').send({ email, password });
    expect(login.status).toBe(403);
    expect(login.body.message).toMatch(/confirm|confirmée|confirmation|verify|vérif/i);
  });

  test('invalid email verification token is rejected', async () => {
    const response = await api.post('/auth/verify-email').send({ token: 'invalid-token' });
    expect(response.status).toBe(400);
  });

  test('forgot password response does not enumerate candidate emails', async () => {
    const response = await api
      .post('/auth/forgot-password')
      .send({ email: uniqueEmail('forgot-missing') });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('Candidate API - protected resources', () => {
  test('candidate endpoints reject anonymous requests', async () => {
    const endpoints = [
      '/candidate/profile',
      '/candidate/applications',
      '/candidate/saved-jobs',
      '/candidate/job-alerts',
      '/candidate/notifications/unread-count',
      '/candidate/dashboard/summary',
    ];

    for (const endpoint of endpoints) {
      const response = await api.get(endpoint);
      expect([401, 403]).toContain(response.status);
    }
  });

  test('verified candidate can read profile, dashboard and collections', async () => {
    if (!candidateEmail || !candidatePassword) {
      console.warn('Skipped: fill TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD.');
      return;
    }

    const token = await loginCandidate();
    const endpoints = [
      '/candidate/profile',
      '/candidate/dashboard/summary',
      '/candidate/dashboard/recommended-jobs',
      '/candidate/applications',
      '/candidate/applications/applied-job-ids',
      '/candidate/saved-jobs',
      '/candidate/job-alerts',
      '/candidate/notifications/unread-count',
    ];

    for (const endpoint of endpoints) {
      const response = await api.get(endpoint).set('Authorization', `Bearer ${token}`);
      expect(response.status, `${endpoint}: ${response.status} ${response.text}`).toBe(200);
      expect(response.body.success).toBe(true);
    }
  });

  test('profile creation requires firstName', async () => {
    if (!candidateEmail || !candidatePassword) {
      console.warn('Skipped: fill TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD.');
      return;
    }

    const token = await loginCandidate();
    const response = await api
      .post('/candidate/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ lastName: 'Validation' });

    expect(response.status).toBe(400);
  });

  test('candidate can update notification preferences when mutations are enabled', async () => {
    if (!allowMutations) {
      console.warn('Skipped: set E2E_ALLOW_CANDIDATE_MUTATIONS=true to update candidate profile data.');
      return;
    }
    if (!candidateEmail || !candidatePassword) {
      console.warn('Skipped: fill TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD.');
      return;
    }

    const token = await loginCandidate();
    const response = await api
      .put('/candidate/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          statusChange: true,
          recruiterMessage: true,
          jobAlert: true,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.notificationPreferences).toMatchObject({
      emailEnabled: true,
      inAppEnabled: true,
    });
  });
});
