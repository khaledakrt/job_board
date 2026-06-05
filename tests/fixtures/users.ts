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
} as const;
