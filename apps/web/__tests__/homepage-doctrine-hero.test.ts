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
    // Exo 2 — the official Galaxy Sports Edge display face (Brand Bible §3),
    // bound to both the heavy archetype slams and the standard headlines.
    expect(layout).toMatch(/Exo_2/);
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

  it("uses the noise-to-signal thesis headline, one cold-open, no legacy hero", () => {
    expect(page).toContain("The market is full of");
    expect(page).toContain("Galaxy turns it into");
    expect(page).toContain("We detect. You decide.");
    // ONE cold-open: the montage stays, the slow doctrine intro is retired.
    expect(page).toContain("MontageEntrance");
    expect(page).not.toContain("CinematicEntrance");
    expect(page).not.toContain("We&apos;re not AI");
    expect(page).not.toMatch(/data-testid="homepage-arch-headline"/);
    expect(page).not.toMatch(/AnnotatedSampleSignal/);
  });

  it("routes the four doors from the front door with live, real-sourced stats", () => {
    for (const door of ["Board", "Players", "Intelligence", "Fantasy & Daily"]) {
      expect(page).toContain(door);
    }
    expect(page).toMatch(/loadBoardState/);
    expect(page).toMatch(/calibration\.sampleSize/);
    expect(page).toMatch(/state\.publishedToday\.length/);
    // The sprawling telemetry card + source-health table moved off the home.
    expect(page).not.toMatch(/Source health/);
    expect(page).not.toMatch(/PUBLIC_DATA_SOURCES/);
  });

  it("keeps the galaxy alive without placeholder node labels", () => {
    expect(galaxy).toMatch(/MAX_CURSOR_DISPLACEMENT = 30/);
    expect(galaxy).toMatch(/pointerTarget\.addEventListener\("pointermove"/);
    expect(galaxy).toMatch(/reduced && drawFrame/);
    expect(galaxy).not.toMatch(/fillText/);
    expect(galaxy).not.toMatch(/"BOARD"|"REST"|"PLAYERS"|"EV"/);
  });
});
