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

describe('Candidate integration - read-only workflow', () => {
  test('candidate can login and load core read-only workspace data', async () => {
    if (!candidateEmail || !candidatePassword) {
      console.warn('Skipped: fill TEST_CANDIDATE_EMAIL and TEST_CANDIDATE_PASSWORD/TEST_PASSWORD.');
      return;
    }

    const login = await api
      .post('/auth/login')
      .send({ email: candidateEmail, password: candidatePassword });

    expect(login.status).toBe(200);
    const token = login.body.data.accessToken;
    expect(token).toEqual(expect.any(String));

    const jobs = await api.get('/jobs').query({ page: 1, limit: 5 });
    expect(jobs.status).toBe(200);
    expect(jobs.body.success).toBe(true);

    const profile = await api.get('/candidate/profile').set('Authorization', `Bearer ${token}`);
    expect(profile.status).toBe(200);

    const dashboard = await api
      .get('/candidate/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(dashboard.status).toBe(200);

    const applications = await api
      .get('/candidate/applications')
      .set('Authorization', `Bearer ${token}`);
    expect(applications.status).toBe(200);

    const saved = await api.get('/candidate/saved-jobs').set('Authorization', `Bearer ${token}`);
    expect(saved.status).toBe(200);

    const alerts = await api.get('/candidate/job-alerts').set('Authorization', `Bearer ${token}`);
    expect(alerts.status).toBe(200);
  });
});
