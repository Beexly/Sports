import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.GALAXY_DYNASTY_URL ?? "http://127.0.0.1:3094";
const outputDir = path.resolve("reports", "game-qa");

const consoleErrors = [];
const pageErrors = [];

async function exerciseDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/galaxy-dynasty`, { waitUntil: "networkidle" });
  await page.waitForSelector('[aria-label="Galaxy Dynasty GTA-style city prototype"]', { timeout: 30000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
  });
  await page.waitForFunction(() => {
    const status = document.querySelector('[aria-label="Galaxy engine status"]');
    return Boolean(status?.textContent?.includes("Rapier 5 bodies"));
  });
  await page.keyboard.down("KeyW");
  await page.keyboard.down("ShiftLeft");
  await page.waitForTimeout(350);
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyW");
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyE");
  const room = await page.request.get(`${baseUrl}/api/galaxy/rookie-plaza`);
  if (!room.ok()) throw new Error(`rookie plaza room API returned ${room.status()}`);
  const roomJson = await room.json();
  const engineStatus = await page.locator('[aria-label="Galaxy engine status"]').textContent();
  await page.screenshot({ path: path.join(outputDir, "galaxy-dynasty-desktop.png"), fullPage: true });
  await page.close();
  return {
    viewport: "desktop",
    roomTick: roomJson.serverTick,
    beatBpm: roomJson.beatWall?.bpm,
    engineStatus,
  };
}

async function exerciseMobile(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/galaxy-dynasty`, { waitUntil: "networkidle" });
  await page.waitForSelector('[aria-label="Galaxy Dynasty GTA-style city prototype"]', { timeout: 30000 });
  const joystick = page.locator('[aria-label="Mobile movement joystick"]');
  await joystick.waitFor({ timeout: 30000 });
  const box = await joystick.boundingBox();
  if (!box) throw new Error("mobile joystick bounding box was unavailable");
  await page.touchscreen.tap(box.x + box.width * 0.72, box.y + box.height * 0.28);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDir, "galaxy-dynasty-mobile.png"), fullPage: true });
  await page.close();
  return {
    viewport: "mobile",
    joystickVisible: true,
  };
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await exerciseDesktop(browser);
  const mobile = await exerciseMobile(browser);
  const result = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    desktop,
    mobile,
    consoleErrors,
    pageErrors,
    capturedAt: new Date().toISOString(),
  };
  await writeFile(path.join(outputDir, "galaxy-dynasty-smoke.json"), JSON.stringify(result, null, 2));
  if (!result.ok) {
    throw new Error(`browser smoke found errors: ${JSON.stringify({ consoleErrors, pageErrors })}`);
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
