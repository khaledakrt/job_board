import { runSmokeSuite } from './smoke-utils.mjs';

const frontendUrl = process.env.FRONTEND_URL || 'https://tun-job-board.com';
const apiUrl = process.env.API_URL || 'https://tun-job-board.com/api';

await runSmokeSuite({
  name: 'Production',
  frontendUrl,
  apiUrl,
  includeRoleLogins: process.env.SMOKE_WITH_LOGINS === 'true',
});
