import { runSmokeSuite } from './smoke-utils.mjs';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
const apiUrl = process.env.API_URL || 'http://localhost:3000/api';

await runSmokeSuite({
  name: 'Local',
  frontendUrl,
  apiUrl,
  includeRoleLogins: process.env.SMOKE_WITH_LOGINS !== 'false',
});
