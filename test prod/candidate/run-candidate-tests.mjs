import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const mode = process.argv[2] || 'all';
const extraArgs = process.argv.slice(3);
const cwd = process.cwd();
const envFile = join(cwd, 'tests', 'e2e', 'prod.env');

if (!existsSync(envFile)) {
  console.warn('tests/e2e/prod.env not found. Copy test prod/candidate/fixtures/candidate-env.example or tests/e2e/prod.env.example first.');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      E2E_BASE_URL: process.env.E2E_BASE_URL || 'https://tun-job-board.com',
      E2E_API_URL: process.env.E2E_API_URL || 'https://tun-job-board.com/api',
    },
    ...options,
  });

  if (result.error) {
    console.error(result.error.message);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const jestBin =
  process.platform === 'win32'
    ? 'backend\\node_modules\\.bin\\jest.cmd'
    : 'backend/node_modules/.bin/jest';
const jestConfig =
  process.platform === 'win32'
    ? '"test prod/candidate/jest.candidate.config.cjs"'
    : 'test prod/candidate/jest.candidate.config.cjs';
const playwrightConfig =
  process.platform === 'win32'
    ? '"test prod/candidate/playwright.candidate.config.ts"'
    : 'test prod/candidate/playwright.candidate.config.ts';

if (mode === 'api' || mode === 'all') {
  if (!existsSync(join(cwd, jestBin))) {
    console.error('Jest is not installed in backend. Run: cd backend; npm install');
    process.exit(1);
  }
  run(jestBin, [
    '--config',
    jestConfig,
    ...extraArgs,
  ]);
}

if (mode === 'e2e' || mode === 'all') {
  run(npx, [
    'playwright',
    'test',
    '--config',
    playwrightConfig,
    ...extraArgs,
  ]);
}

if (!['api', 'e2e', 'all'].includes(mode)) {
  console.error(`Unknown mode "${mode}". Use: api, e2e, all.`);
  process.exit(1);
}
