import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("data-first public surfaces", () => {
  it("homepage is data-first — every number from a real loader, no fabricated rows", () => {
    const page = read("apps/web/app/page.tsx");
    // The concise home routes the four doors and shows only live, real-sourced
    // counts; demo suppression happens in the loaders, so the home renders no
    // public board rows at all (nothing to fake).
    expect(page).toMatch(/loadBoardState/);
    expect(page).toMatch(/loadPublicCalibrationReport/);
    expect(page).toMatch(/loadNflverseUsagePulse/);
    expect(page).toMatch(/calibration\.sampleSize/);
    expect(page).toMatch(/Pick the decision you came to make/);
    expect(page).not.toMatch(/AnnotatedSampleSignal/);
    expect(page).not.toMatch(/sample-data-banner-home/);
    // No fabricated demo arrays defined inline on the front door.
    expect(page).not.toMatch(/FALLBACK_PICKS/);
  });

  it("Trend Lab is a real route wired to the trend workbench and source catalog", () => {
    const page = read("apps/web/app/trends/page.tsx");
    const workbench = read("apps/web/lib/trends/workbench.ts");
    expect(page).toMatch(/loadTrendWorkbench/);
    expect(page).toMatch(/PUBLIC_DATA_SOURCES/);
    expect(page).toMatch(/CONTEXT_INTELLIGENCE_SOURCES/);
    expect(page).toMatch(/Context feeds/);
    expect(page).toMatch(/No synthetic p-values/);
    expect(page).toMatch(/loadQbAgeRbTrendReport/);
    expect(page).toMatch(/loadBirthdayUsageTrendReport/);
    expect(page).toMatch(/Read-only research result/);
    expect(page).toMatch(/QB age 34\+ increases RB target share/);
    expect(page).toMatch(/Rejected narrative/);
    expect(page).toMatch(/Birthday and milestone boosts are not publishable/);
    expect(workbench).toMatch(/discoverCohortTrends/);
    expect(workbench).toMatch(/loadLiveObservations/);
    expect(workbench).toMatch(/return \[\]/);
  });

  it("NFLverse Usage Pulse renders real source rows without publishing trends", () => {
    const page = read("apps/web/app/nflverse/page.tsx");
    const loader = read("apps/web/lib/nflverse/usage-pulse.ts");
    const route = read("apps/web/app/api/nflverse/usage-pulse/route.ts");
    expect(page).toMatch(/Real NFL rows before real claims/);
    expect(page).toMatch(/Top opportunity rows/);
    expect(page).toMatch(/QB age context/);
    expect(page).toMatch(/Historical cohort result/);
    expect(page).toMatch(/QB age 34\+ to RB target share/);
    expect(page).toMatch(/Birthday usage myth check/);
    expect(page).toMatch(/loadBirthdayUsageTrendReport/);
    expect(loader).toMatch(/player_stats_week/);
    expect(loader).toMatch(/canPublishTrends: false/);
    expect(loader).toMatch(/nflverseUrl\("player_stats_week"/);
    expect(route).toMatch(/loadNflverseUsagePulse/);
  });

  it("context source catalog respects owned, licensed, and permission-required boundaries", () => {
    const catalog = read("apps/web/lib/data-sources/catalog.ts");
    expect(catalog).toMatch(/Airwave transcript spreadsheet/);
    expect(catalog).toMatch(/Galaxy Studio asset engine/);
    expect(catalog).toMatch(/Scores24 reference feed/);
    expect(catalog).toMatch(/permission-required/);
    expect(catalog).toMatch(/No scraper or automated interaction is wired/);
    expect(catalog).toMatch(/Satellite-radio capture requires explicit legal acknowledgement/);
  });

  it("integrations page is the public source-control ledger, not an env-only list", () => {
    const page = read("apps/web/app/integrations/page.tsx");
    expect(page).toMatch(/DATA_SOURCE_STACK/);
    expect(page).toMatch(/TREND_BACKLOG/);
    expect(page).toMatch(/providerStatuses/);
    expect(page).toMatch(/loadSourceLiveEvidence/);
    expect(page).toMatch(/Source control for the engine/);
    expect(page).toMatch(/Live source proof/);
    expect(page).toMatch(/Row counts are evidence, not permission to score/);
    expect(page).toMatch(/Usage Pulse JSON/);
    expect(page).toMatch(/Narrative myth JSON/);
    expect(page).toMatch(/Permission is part of the architecture/);
    expect(page).toMatch(/permission-required/);
    expect(page).not.toMatch(/Atmosphere/);
    expect(page).not.toMatch(/Reveal/);
  });

  it("fantasy tools stop at the public data gate before illustrative content can render", () => {
    const middleware = read("apps/web/middleware.ts");
    const fantasy = read("apps/web/app/fantasy/page.tsx");
    const gate = read("apps/web/lib/fantasy/public-gate.ts");
    const explainers = read("apps/web/lib/explainers/registry.ts");
    const commandPalette = read("apps/web/components/ui/command-palette.tsx");
    expect(middleware).toMatch(/isPublicFantasyToolPath/);
    expect(middleware).toMatch(/fantasyGateDestination/);
    expect(gate).toMatch(/"\/optimizer"/);
    expect(gate).toMatch(/"\/fantasy\/studio"/);
    expect(fantasy).toMatch(/Fantasy tools stay closed until every player row is real/);
    expect(fantasy).toMatch(/Data clearance manifest/);
    expect(fantasy).toMatch(/0 \/ 4 clear/);
    expect(fantasy).not.toMatch(/LEGACY_TOOL_ROUTES|TOOL_DIRECTORY|loadSourceLiveEvidence/);
    expect(fantasy).not.toMatch(/illustrative pool now|partly live/i);
    expect(explainers).not.toMatch(/route:\s*"\/fantasy"/);
    expect(commandPalette).toMatch(/hidden items-center[^"]*sm:flex/);
  });
});
