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

  it("uses one arch headline for the front-door hero", () => {
    expect(page).toContain("Math you can read.");
    expect(page).toMatch(/<span className="text-plasma">\.<\/span>/);
    expect(page).not.toContain("We&apos;re not AI");
    expect(page).not.toMatch(/<span className="eyebrow text-ion-1">Live board<\/span>/);
    expect(page.match(/font-arch/g) ?? []).toHaveLength(1);
    expect(page).toMatch(/data-testid="homepage-arch-headline"/);
  });

  it("renders the interactive galaxy and telemetry in the hero", () => {
    expect(page).toMatch(/InteractiveGalaxy/);
    expect(page).toMatch(/Live board telemetry/);
    expect(page).toMatch(/sportsWatched/);
    expect(page).toMatch(/booksPolled/);
    expect(page).toMatch(/openPicks/);
    expect(page).toMatch(/lastRefresh/);
    expect(page).toMatch(/modelVersion/);
    expect(page).toMatch(/font-numerals/);
    expect(page).toMatch(/text-orbital-cyan/);
  });

  it("keeps the galaxy alive without placeholder node labels", () => {
    expect(galaxy).toMatch(/MAX_CURSOR_DISPLACEMENT = 30/);
    expect(galaxy).toMatch(/pointerTarget\.addEventListener\("pointermove"/);
    expect(galaxy).not.toMatch(/fillText/);
    expect(galaxy).not.toMatch(/"BOARD"|"REST"|"PLAYERS"|"EV"/);
  });
});
