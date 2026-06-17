import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'screenshots');
mkdirSync(outDir, { recursive: true });

const baseUrl = process.env.PROMO_SITE_URL || 'https://tun-job-board.com';
const viewport = { width: 1080, height: 1920 };

const pages = [
  { name: '01-home', path: '/', waitFor: 'body' },
  { name: '02-jobs', path: '/offres', waitFor: 'body' },
  { name: '03-training', path: '/centres-formation', waitFor: 'body' },
  { name: '04-institutions', path: '/etablissements-prives', waitFor: 'body' },
  { name: '05-login', path: '/auth/login', waitFor: 'body' },
  { name: '06-register', path: '/auth/register', waitFor: 'body' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });

for (const item of pages) {
  const url = `${baseUrl.replace(/\/$/, '')}${item.path}`;
  const screenshotPath = join(outDir, `${item.name}.png`);
  console.log(`Capturing ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.locator(item.waitFor).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
  });
  console.log(`${existsSync(screenshotPath) ? 'Saved' : 'Missing'} ${screenshotPath}`);
}

await browser.close();
console.log(`Screenshots saved in ${outDir}`);
