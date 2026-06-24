const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const outDir = path.resolve('reports/game-qa');
  fs.mkdirSync(outDir, { recursive: true });
  const result = { ok: false, routes: [], screenshots: [], consoleErrors: [], pageErrors: [] };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
  page.on('console', (msg) => { if (msg.type() === 'error') result.consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => result.pageErrors.push(err.message));
  async function shot(name) {
    const target = path.join(outDir, name);
    await page.screenshot({ path: target, fullPage: true });
    result.screenshots.push(target);
  }
  async function gotoRoute(route) {
    await page.goto(`http://127.0.0.1:3084${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    result.routes.push(route);
  }
  try {
    await gotoRoute('/galaxy/campus/rookie-plaza');
    await page.waitForSelector('canvas[aria-label="Rookie Plaza spatial scene"]', { timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot('rookie-plaza-idle.png');
    await page.keyboard.down('KeyD'); await page.waitForTimeout(350); await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyW'); await page.waitForTimeout(350); await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyE');
    await page.getByRole('button', { name: /Coach Signal/i }).click({ timeout: 10000 });
    await shot('rookie-plaza-npc-dialogue.png');
    await page.getByRole('button', { name: /^Quest$/i }).click({ timeout: 10000 });
    await page.getByRole('button', { name: /Run First Signal/i }).click({ timeout: 10000 });
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: /^Inventory$/i }).click({ timeout: 10000 });
    await shot('rookie-plaza-inventory.png');
    await page.getByRole('button', { name: /^Hide Gear$/i }).click({ timeout: 10000 });
    await shot('rookie-plaza-quest-board.png');
    await gotoRoute('/galaxy/blacktop');
    await page.waitForTimeout(2500);
    await shot('blacktop-phaser.png');
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
    await shot('blacktop-result.png');
    await gotoRoute('/galaxy/depths');
    await page.waitForTimeout(1000);
    for (const button of await page.getByRole('button', { name: /Read the value/i }).all()) {
      await button.click({ timeout: 10000 });
    }
    await page.getByRole('button', { name: /Face/i }).click({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await shot('depths-public-trap.png');
    await gotoRoute('/galaxy/dynasty');
    await page.waitForTimeout(1000);
    await shot('my-dynasty-progress.png');
    await gotoRoute('/galaxy/beat');
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: /Enable Pulse Audio/i }).click({ timeout: 10000 });
    await page.getByRole('button', { name: /Strike Pulse/i }).click({ timeout: 10000 });
    await shot('beat-broadcast-wall.png');
    result.lastCanvasCount = await page.locator('canvas').count();
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    mobilePage.on('console', (msg) => { if (msg.type() === 'error') result.consoleErrors.push(`[mobile] ${msg.text()}`); });
    mobilePage.on('pageerror', (err) => result.pageErrors.push(`[mobile] ${err.message}`));
    await mobilePage.goto('http://127.0.0.1:3084/galaxy/campus/rookie-plaza', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await mobilePage.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await mobilePage.waitForSelector('canvas[aria-label="Rookie Plaza spatial scene"]', { timeout: 60000 });
    await mobilePage.waitForSelector('[aria-label="Touch movement joystick"]', { timeout: 60000 });
    await mobilePage.touchscreen.tap(70, 750);
    await mobilePage.waitForTimeout(900);
    const mobileRookieTarget = path.join(outDir, 'rookie-plaza-mobile.png');
    await mobilePage.screenshot({ path: mobileRookieTarget, fullPage: true });
    result.screenshots.push(mobileRookieTarget);
    await mobilePage.goto('http://127.0.0.1:3084/galaxy/beat', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await mobilePage.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    await mobilePage.waitForTimeout(1800);
    const mobileBeatTarget = path.join(outDir, 'beat-broadcast-wall-mobile.png');
    await mobilePage.screenshot({ path: mobileBeatTarget, fullPage: true });
    result.screenshots.push(mobileBeatTarget);
    result.mobileCanvasCount = await mobilePage.locator('canvas').count();
    await mobilePage.close();
    const materialConsoleErrors = result.consoleErrors.filter((m) => !/favicon|Sentry|observability|not wired|Failed to load resource|Failed to fetch RSC payload|Falling back to browser navigation/i.test(m));
    result.materialConsoleErrors = materialConsoleErrors;
    result.ok = result.pageErrors.length === 0 && materialConsoleErrors.length === 0;
  } catch (err) {
    result.failure = err && err.stack ? err.stack : String(err);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outDir, 'playwright-result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
  }
})();
