import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const WORKFLOW = resolve(repoRoot, ".github/workflows/source-health-alarm.yml");
const SCRIPT = resolve(repoRoot, "scripts/check-source-health.mjs");

describe(".github/workflows/source-health-alarm.yml", () => {
  const src = readFileSync(WORKFLOW, "utf8");

  it("runs on a schedule + supports manual dispatch", () => {
    expect(src).toMatch(/schedule:\s*\n\s*-\s*cron:\s*["'][^"']+["']/);
    expect(src).toMatch(/workflow_dispatch:/);
  });

  it("uses concurrency group to prevent overlapping polls", () => {
    expect(src).toMatch(/concurrency:[\s\S]*group:\s*source-health-alarm/);
  });

  it("checks out + sets up Node + runs the alarm script", () => {
    expect(src).toMatch(/actions\/checkout@v4/);
    expect(src).toMatch(/actions\/setup-node@v4/);
    expect(src).toMatch(/scripts\/check-source-health\.mjs/);
  });

  it("reads SOURCE_HEALTH_URL + SOURCE_HEALTH_TOKEN from secrets", () => {
    expect(src).toMatch(/SOURCE_HEALTH_URL:\s*\$\{\{\s*secrets\.SOURCE_HEALTH_URL\s*\}\}/);
    expect(src).toMatch(/SOURCE_HEALTH_TOKEN:\s*\$\{\{\s*secrets\.SOURCE_HEALTH_TOKEN\s*\}\}/);
  });

  it("permissions are read-only (no contents: write, no pull-requests: write)", () => {
    expect(src).toMatch(/permissions:[\s\S]*contents:\s*read/);
    expect(src).not.toMatch(/contents:\s*write/);
    expect(src).not.toMatch(/pull-requests:\s*write/);
  });

  it("no auto-publish, no auto-merge anywhere", () => {
    expect(src).not.toMatch(/auto[- ]publish|auto[- ]merge|--auto\b|gh\s+pr\s+merge/i);
  });
});

describe("scripts/check-source-health.mjs", () => {
  const src = readFileSync(SCRIPT, "utf8");

  it("polls the URL via fetch and exits non-zero on HIGH alerts", () => {
    expect(src).toMatch(/fetch\(url/);
    expect(src).toMatch(/SOURCE_HEALTH_URL/);
    expect(src).toMatch(/ALERT_FAIL_LEVEL/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it("exits 0 cleanly when no alerts firing", () => {
    expect(src).toMatch(/process\.exit\(0\)/);
    expect(src).toMatch(/no alerts at or above/);
  });

  it("exits 2 for transport / config failures (distinct from the 1 used by firing alerts)", () => {
    expect(src).toMatch(/process\.exit\(2\)/);
  });

  it("forwards a cookie header from SOURCE_HEALTH_TOKEN for admin auth", () => {
    expect(src).toMatch(/headers\.cookie\s*=\s*token/);
  });

  it("never writes a file, never POSTs, never calls a third-party API", () => {
    expect(src).not.toMatch(/writeFile|appendFile/);
    expect(src).not.toMatch(/method:\s*["']POST["']/);
    expect(src).not.toMatch(/slack|discord|twilio|sendgrid/i);
  });

  it("severity ranking is documented inline (LOW/MEDIUM/HIGH)", () => {
    expect(src).toMatch(/LOW:\s*1/);
    expect(src).toMatch(/MEDIUM:\s*2/);
    expect(src).toMatch(/HIGH:\s*3/);
  });
});
