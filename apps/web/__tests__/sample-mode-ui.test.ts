import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level guarantees that the launch-night sample-mode UI cues are
 * present on the surfaces an operator and a customer will look at.
 *
 *   - /dashboard renders a "Sample mode" pill + sample-data banner for operators
 *   - /picks renders a sample-data banner with the same gate
 *   - public board loaders suppress demo rows rather than rendering fake product data
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

  it("/ (home) renders no public board rows - the static homepage imports no board loader at all", () => {
    const src = read("app/page.tsx");
    // REPOINT (2026-11-04): the homepage is now the static RedlineWorld +
    // responsible close. The old contract asserted suppression *inside*
    // the board loaders (loadBoardState returning empty readiness). This
    // era goes further: the page never imports a board loader, so there
    // is no fake public data to render in the first place. Pin the
    // stronger property, plus the carried-over prohibitions: no board
    // rows are ever mapped into the page, and no sample banner exists on
    // a page with no data surface.
    expect(src).not.toMatch(/loadBoardState/);
    expect(src).not.toMatch(/state\.publishedToday\.map/);
    expect(src).not.toMatch(/state\.gatedTodayRows\.map/);
    expect(src).not.toMatch(/sample-data-banner-home/);
    expect(src).toContain('data-testid="homepage-responsible-close"');
  });

  it("public board loaders return empty readiness state when demo mode is active", () => {
    const state = read("lib/board/state.ts");
    const passes = read("lib/board/passes.ts");
    expect(state).toMatch(/suppressedDemoData: true/);
    expect(state).toMatch(/publishedToday: \[\]/);
    expect(passes).toMatch(/suppressedDemoData: true/);
    expect(passes).toMatch(/passes: \[\]/);
  });

  it("/picks is a static sealed card with no demo banner - the seal digest is its provenance", () => {
    const src = read("app/picks/page.tsx");
    // REPOINT (2026-11-04): /picks is the static sealed Week 8 locked
    // board. It has no demo mode and renders no sample data, so a
    // sample-data banner would be a lie about what the surface is. The
    // honesty invariant that banner used to carry (sample data must never
    // be mistaken for live data) is preserved structurally: the page
    // reads ONLY the sealed card and renders the seal digest as its
    // provenance. The dashboard banner test below still covers the one
    // surface that does render sample data.
    expect(src).not.toMatch(/sample-data-banner-picks/);
    expect(src).not.toMatch(/isDemoPicksEnabled/);
    expect(src).toContain("sealed-board.json");
    expect(src).toMatch(/Publish-allowed sealed card|seal/);
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
      // - we check the negative invariant: no "Verified Record: <number>"
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
