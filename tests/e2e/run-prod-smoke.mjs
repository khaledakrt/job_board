import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const envFile = join(process.cwd(), 'tests', 'e2e', 'prod.env');
const args = process.argv.slice(2);

if (!existsSync(envFile)) {
  console.warn('tests/e2e/prod.env not found. Using defaults from prod.env.example.');
  console.warn('For login checks, copy tests/e2e/prod.env.example to tests/e2e/prod.env and fill test accounts.');
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  command,
  [
    'playwright',
    'test',
    'tests/e2e/prod-smoke.spec.ts',
    '--project=prod-chromium',
    ...args,
  ],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      E2E_BASE_URL: process.env.E2E_BASE_URL || 'https://tun-job-board.com',
      E2E_API_URL: process.env.E2E_API_URL || 'https://tun-job-board.com/api',
    },
  }
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
