import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage doctrine hero", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const layout = readRepoFile("apps/web/app/layout.tsx");
  const tokens = readRepoFile("apps/web/styles/design-tokens.css");
  const tailwind = readRepoFile("apps/web/tailwind.config.ts");
  const galaxy = readRepoFile("apps/web/components/hero/interactive-galaxy.tsx");

  it("loads the doctrine font families through next/font and binds the CSS vars", () => {
    expect(layout).toMatch(/Big_Shoulders_Display/);
    expect(layout).toMatch(/Syne/);
    expect(layout).toMatch(/Inter/);
    expect(tokens).toMatch(/--f-body: "Geist", "Inter"/);
    expect(layout).toMatch(/JetBrains_Mono/);
    expect(layout).toMatch(/Instrument_Serif/);
    for (const cssVar of [
      "--f-arch",
      "--f-display",
      "--f-body",
      "--f-mono",
      "--f-numerals",
      "--f-editorial",
    ]) {
      expect(layout).toContain(`variable: "${cssVar}"`);
      expect(tailwind).toContain(`var(${cssVar})`);
    }
    expect(tokens).not.toMatch(/fonts\.googleapis\.com/);
  });

  it("uses a data-first front-door headline", () => {
    expect(page).toContain("The board is only as smart as the data behind it.");
    expect(page).toContain("No public pick or projection appears unless the");
    expect(page).not.toContain("We&apos;re not AI");
    expect(page).not.toMatch(/data-testid="homepage-arch-headline"/);
    expect(page).not.toMatch(/AnnotatedSampleSignal/);
  });

  it("renders board telemetry, source health, and Trend Lab from the front door", () => {
    expect(page).toMatch(/Board state/);
    expect(page).toMatch(/Source health/);
    expect(page).toMatch(/Trend Lab/);
    expect(page).toMatch(/PUBLIC_DATA_SOURCES/);
    expect(page).toMatch(/TREND_BACKLOG/);
    expect(page).toMatch(/sportsWatched/);
    expect(page).toMatch(/booksPolled/);
    expect(page).toMatch(/openPicks/);
    expect(page).toMatch(/lastRefresh/);
    expect(page).toMatch(/font-numerals/);
  });

  it("keeps the galaxy alive without placeholder node labels", () => {
    expect(galaxy).toMatch(/MAX_CURSOR_DISPLACEMENT = 30/);
    expect(galaxy).toMatch(/pointerTarget\.addEventListener\("pointermove"/);
    expect(galaxy).toMatch(/reduced && drawFrame/);
    expect(galaxy).not.toMatch(/fillText/);
    expect(galaxy).not.toMatch(/"BOARD"|"REST"|"PLAYERS"|"EV"/);
  });
});
