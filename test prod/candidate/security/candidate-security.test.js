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

describe('Candidate security - non destructive checks', () => {
  test('candidate endpoints reject forged JWT', async () => {
    const response = await api
      .get('/candidate/profile')
      .set('Authorization', 'Bearer forged.jwt.token');

    expect([401, 403]).toContain(response.status);
  });

  test('candidate endpoints reject malformed authorization header', async () => {
    const response = await api
      .get('/candidate/applications')
      .set('Authorization', 'NotBearer token');

    expect([401, 403]).toContain(response.status);
  });

  test('public job search handles SQL injection-like input without server error', async () => {
    const response = await api.get('/jobs').query({
      keywords: "' OR 1=1 --",
      location: "Tunis'; DROP TABLE jobs; --",
      page: 1,
      limit: 5,
    });

    expect(response.status).toBeLessThan(500);
  });

  test('public job search handles reflected XSS-like input without server error', async () => {
    const response = await api.get('/jobs').query({
      keywords: '<script>alert("xss")</script>',
      page: 1,
      limit: 5,
    });

    expect(response.status).toBeLessThan(500);
    expect(response.text).not.toContain('<script>alert("xss")</script>');
  });

  test('protected upload path traversal is not served publicly', async () => {
    const suspicious = [
      '/uploads/resumes/../../backend/.env',
      '/uploads/snapshots/../../backend/.env',
    ];

    for (const path of suspicious) {
      const response = await api.get(path);
      expect([400, 401, 403, 404]).toContain(response.status);
    }
  });
});
