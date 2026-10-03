import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = process.env.OUT_DIR ?? 'screenshots';
const WIDTH = Number(process.env.WIDTH ?? 1440);
const HEIGHT = Number(process.env.HEIGHT ?? 900);
const FULL_PAGE = (process.env.FULL_PAGE ?? '1') === '1';

const args = process.argv.slice(2);
const targets = (args.length ? args : ['/']).map((t) =>
  /^https?:\/\//.test(t) ? t : BASE_URL.replace(/\/$/, '') + (t.startsWith('/') ? t : '/' + t)
);
const slug = (u) =>
  u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'page';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await mkdir(OUT_DIR, { recursive: true });
for (const url of targets) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const file = join(OUT_DIR, `${slug(url)}.png`);
    await page.screenshot({ path: file, fullPage: FULL_PAGE });
    console.log(`OK  ${url}  ->  ${file}`);
  } catch (err) {
    console.error(`FAIL ${url}: ${err.message}`);
  }
}
await browser.close();
