import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level guarantees that the launch-night sample-mode UI cues are
 * present on the surfaces an operator and a customer will look at.
 *
 *   - /dashboard renders a "Sample mode" pill + sample-data banner
 *     gated by isStubMode() && isDemoPicksEnabled()
 *   - /picks renders a sample-data banner with the same gate
 *   - /cockpit shows a "Today's picks: N (sample)" pill
 *
 * These are the visual contracts that keep sample data from being
 * mistaken for live data.
 */

const repoRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Sample-mode UI contracts", () => {
  it("/dashboard imports the demo-mode flags", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/isStubMode\b/);
    expect(src).toMatch(/isDemoPicksEnabled\b/);
  });

  it("/dashboard has a sample-data banner gated by demo mode", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/data-testid="sample-data-banner"/);
    expect(src).toMatch(/{demoActive && <SampleDataBanner/);
  });

  it("/dashboard has a 'Sample mode' header pill", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/data-testid="dashboard-sample-mode"/);
    expect(src).toMatch(/Sample mode/);
  });

  it("/ (home) renders a sample-data banner under demo mode", () => {
    const src = read("app/page.tsx");
    expect(src).toMatch(/data-testid="sample-data-banner-home"/);
    expect(src).toMatch(/never produce a verified win-rate/);
  });

  it("/picks renders a sample-data banner under demo mode", () => {
    const src = read("app/picks/page.tsx");
    expect(src).toMatch(/data-testid="sample-data-banner-picks"/);
    expect(src).toMatch(/never count toward a verified record/);
  });

  it("/cockpit shows a today's-picks pill that flags sample mode", () => {
    const src = read("app/cockpit/page.tsx");
    expect(src).toMatch(/data-testid="jarvis-today-picks"/);
    expect(src).toMatch(/\(sample\)/);
  });

  it("/cockpit lists today's operator picks when present", () => {
    const src = read("app/cockpit/page.tsx");
    expect(src).toMatch(/data-testid="cockpit-today-picks-list"/);
  });

  it("/dashboard and /picks banners never claim a verified record", () => {
    const dash = read("app/dashboard/page.tsx");
    const picks = read("app/picks/page.tsx");
    for (const src of [dash, picks]) {
      // The banner text says "no win-rate claim is published" / "never settle"
      // — we check the negative invariant: no "Verified Record: <number>"
      expect(src).not.toMatch(/Verified Record.{0,40}\d+W/);
    }
  });

  it("jarvis-data injects a sample-mode safety warning when demo is on", () => {
    const src = read("lib/cockpit/jarvis-data.ts");
    expect(src).toMatch(/DEMO_PICKS_ENABLED=true/);
    expect(src).toMatch(/safetyWarnings\.unshift/);
  });

  it("jarvis-data injects a stub-mode safety warning", () => {
    const src = read("lib/cockpit/jarvis-data.ts");
    expect(src).toMatch(/stub mode is active/);
  });

  it("jarvis-data adds recommended actions to switch off stub + demo", () => {
    const src = read("lib/cockpit/jarvis-data.ts");
    expect(src).toMatch(/Set DATABASE_URL/);
    expect(src).toMatch(/Unset DEMO_PICKS_ENABLED/);
  });
});

describe("Sample-mode brand safety", () => {
  it("sample picks file never claims a guarantee", () => {
    const src = read("../../packages/db/src/sample-picks.ts");
    for (const banned of ["guaranteed", "sure thing", "100%", "always wins"]) {
      expect(src.toLowerCase()).not.toContain(banned);
    }
  });

  it("sample picks file forces result = PENDING", () => {
    const src = read("../../packages/db/src/sample-picks.ts");
    expect(src).toMatch(/result:\s*"PENDING"/);
  });
});
