import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("data-first public surfaces", () => {
  it("homepage leads with data readiness and suppresses public demo rows", () => {
    const page = read("apps/web/app/page.tsx");
    expect(page).toMatch(/The board is only as smart as the data behind it/);
    expect(page).toMatch(/Demo data suppressed/);
    expect(page).toMatch(/PUBLIC_DATA_SOURCES/);
    expect(page).toMatch(/CONTEXT_INTELLIGENCE_SOURCES/);
    expect(page).toMatch(/DATA_SOURCE_STACK/);
    expect(page).toMatch(/loadNflverseUsagePulse/);
    expect(page).toMatch(/Real NFL rows/);
    expect(page).not.toMatch(/AnnotatedSampleSignal/);
    expect(page).not.toMatch(/sample-data-banner-home/);
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

  it("public fantasy tools redirect unless the live-data flag is explicitly enabled", () => {
    const middleware = read("apps/web/middleware.ts");
    const fantasy = read("apps/web/app/fantasy/page.tsx");
    expect(middleware).toMatch(/FANTASY_PUBLIC_TOOLS_ENABLED/);
    expect(middleware).toMatch(/PUBLIC_FANTASY_GATED_ROUTES/);
    expect(fantasy).toMatch(/Real roster first/);
    expect(fantasy).toMatch(/No fake projections/);
    expect(fantasy).toMatch(/Connect your league/);
  });
});
