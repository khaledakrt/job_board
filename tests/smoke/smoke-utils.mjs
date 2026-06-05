const DEFAULT_TIMEOUT_MS = 10_000;

export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test1234!';

export const TEST_USERS = {
  candidate: {
    email: process.env.TEST_CANDIDATE_EMAIL || 'candidate@test.com',
    password: TEST_PASSWORD,
  },
  recruiter: {
    email: process.env.TEST_RECRUITER_EMAIL || 'recruiter@test.com',
    password: TEST_PASSWORD,
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: TEST_PASSWORD,
  },
};

export function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

export function joinUrl(baseUrl, path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

export async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs || DEFAULT_TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function expectHttpOk(name, url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) {
    throw new Error(`${name} failed: HTTP ${response.status} ${response.statusText}`);
  }
  return response;
}

export async function expectJsonOk(name, url, options = {}) {
  const response = await expectHttpOk(name, url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await response.json();
  if (body.success !== true) {
    throw new Error(`${name} failed: API success flag is not true`);
  }
  return body;
}

export async function login(apiBaseUrl, label, credentials) {
  const response = await fetchWithTimeout(joinUrl(apiBaseUrl, '/auth/login'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`${label} login failed: HTTP ${response.status} ${body}`);
  }

  const body = await response.json();
  if (!body.data?.accessToken) {
    throw new Error(`${label} login failed: missing access token`);
  }

  return body.data.accessToken;
}

export async function expectAuthorizedJsonOk(name, apiBaseUrl, path, token) {
  return expectJsonOk(name, joinUrl(apiBaseUrl, path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function runSmokeSuite({ name, frontendUrl, apiUrl, includeRoleLogins }) {
  const results = [];

  async function step(label, fn) {
    const startedAt = Date.now();
    try {
      await fn();
      results.push({ label, ok: true, ms: Date.now() - startedAt });
      console.log(`OK ${label}`);
    } catch (error) {
      results.push({ label, ok: false, ms: Date.now() - startedAt, error });
      console.error(`FAIL ${label}`);
      console.error(`   ${error.message}`);
    }
  }

  console.log(`\n=== ${name} smoke test ===`);
  console.log(`Frontend: ${frontendUrl}`);
  console.log(`API:      ${apiUrl}\n`);

  await step('Frontend home responds', () =>
    expectHttpOk('Frontend home', joinUrl(frontendUrl, '/'))
  );
  await step('Frontend jobs page responds', () =>
    expectHttpOk('Frontend jobs', joinUrl(frontendUrl, '/offres'))
  );
  await step('Frontend training centers page responds', () =>
    expectHttpOk('Frontend training centers', joinUrl(frontendUrl, '/centres-formation'))
  );
  await step('Frontend private institutions page responds', () =>
    expectHttpOk('Frontend private institutions', joinUrl(frontendUrl, '/etablissements-prives'))
  );
  await step('API health responds', () =>
    expectJsonOk('API health', joinUrl(apiUrl, '/health'))
  );
  await step('Public jobs API responds', () =>
    expectJsonOk('Public jobs API', joinUrl(apiUrl, '/jobs?page=1&limit=1'))
  );
  await step('Public training centers API responds', () =>
    expectJsonOk('Public training centers API', joinUrl(apiUrl, '/public/training-centers?page=1&limit=1'))
  );
  await step('Public institutions API responds', () =>
    expectJsonOk('Public institutions API', joinUrl(apiUrl, '/public/private-institutions?page=1&limit=1'))
  );

  if (includeRoleLogins) {
    await step('Candidate login and dashboard API respond', async () => {
      const token = await login(apiUrl, 'Candidate', TEST_USERS.candidate);
      await expectAuthorizedJsonOk('Candidate dashboard', apiUrl, '/candidate/dashboard/summary', token);
      await expectAuthorizedJsonOk('Candidate applications', apiUrl, '/candidate/applications', token);
      await expectAuthorizedJsonOk('Candidate saved jobs', apiUrl, '/candidate/saved-jobs', token);
    });

    await step('Recruiter login and profile API respond', async () => {
      const token = await login(apiUrl, 'Recruiter', TEST_USERS.recruiter);
      await expectAuthorizedJsonOk('Recruiter profile', apiUrl, '/recruiter/profile', token);
      await expectAuthorizedJsonOk('Recruiter jobs', apiUrl, '/recruiter/jobs?page=1&limit=5', token);
      await expectAuthorizedJsonOk('Recruiter applications', apiUrl, '/applications?page=1&limit=5', token);
      await expectAuthorizedJsonOk('Recruiter notifications', apiUrl, '/recruiter/notifications', token);
    });

    await step('Admin login and dashboard API respond', async () => {
      const token = await login(apiUrl, 'Admin', TEST_USERS.admin);
      await expectAuthorizedJsonOk('Admin dashboard', apiUrl, '/admin/stats', token);
      await expectAuthorizedJsonOk('Admin users', apiUrl, '/admin/users?page=1&limit=5', token);
      await expectAuthorizedJsonOk('Admin jobs', apiUrl, '/admin/jobs?page=1&limit=5', token);
      await expectAuthorizedJsonOk('Admin training centers', apiUrl, '/admin/training-centers?page=1&limit=5', token);
      await expectAuthorizedJsonOk('Admin private institutions', apiUrl, '/admin/private-institutions?page=1&limit=5', token);
    });
  } else {
    console.log('\nRole login checks skipped. Set SMOKE_WITH_LOGINS=true to enable them.');
  }

  const failed = results.filter((result) => !result.ok);
  console.log('\n=== Summary ===');
  for (const result of results) {
    console.log(`${result.ok ? 'OK  ' : 'FAIL'} ${result.label} (${result.ms}ms)`);
  }

  if (failed.length) {
    throw new Error(`${failed.length} smoke check(s) failed`);
  }

  console.log('\nSmoke test passed.\n');
}

async function safeReadBody(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
