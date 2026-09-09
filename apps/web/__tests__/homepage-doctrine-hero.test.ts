import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage doctrine hero", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const labDoor = readRepoFile(
    "apps/web/components/landing/nflverse-lab-door.tsx"
  );
  const layout = readRepoFile("apps/web/app/layout.tsx");
  const tokens = readRepoFile("apps/web/styles/design-tokens.css");
  const tailwind = readRepoFile("apps/web/tailwind.config.ts");
  const galaxy = readRepoFile("apps/web/components/hero/interactive-galaxy.tsx");

  it("ships exactly one type family, with tabular figures (design contract Law 1)", () => {
    // Law 1 — evidence sets the rendering. A figure and its sample size must sit
    // at the same optical size at n=10-29, which is unachievable across two
    // families: a mono figure beside a sans caption reads as machine output
    // annotated by a human. Inter carries every role, and "tnum" replaces the
    // half of the mono role that was load-bearing (column alignment).
    //
    // Supersedes the previous Exo 2 / JetBrains Mono / Instrument Serif doctrine.
    // If you are here because this test failed, the question is not "how do I
    // make it pass" but "am I re-opening Law 1".

    // Exactly one family is fetched, and it is Inter.
    expect(layout.match(/Inter\(/g)).toHaveLength(1);
    for (const retired of ["Exo_2", "JetBrains_Mono", "Instrument_Serif"]) {
      expect(layout).not.toMatch(new RegExp(retired));
    }

    // next/font binds --f-body and nothing else; every other family derives.
    expect(layout).toContain(`variable: "--f-body"`);
    for (const derived of [
      "--f-display",
      "--f-arch",
      "--f-display-tech",
      "--f-numerals",
      "--f-mono",
      "--f-editorial",
    ]) {
      expect(layout).not.toContain(`variable: "${derived}"`);
      // ...and each one resolves back to --f-body in the token file.
      expect(tokens).toMatch(new RegExp(`${derived}:\\s*var\\(--f-body`));
    }

    // --f-body is owned by next/font and must NOT be redeclared in :root, or the
    // element-level binding and the token file fight over the cascade.
    expect(tokens).not.toMatch(/^\s*--f-body:/m);

    // Tabular figures, globally. This is the numerals role now.
    expect(tokens).toMatch(/font-feature-settings:\s*"tnum"\s*1/);

    // The Tailwind utilities still resolve through the vars, which is why the
    // 245 files using font-display / font-mono / font-numerals needed no edit.
    for (const cssVar of [
      "--f-arch",
      "--f-display",
      "--f-body",
      "--f-mono",
      "--f-numerals",
      "--f-editorial",
    ]) {
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
    // "The Lab" label lives in the NflverseLabDoor component (P16-01 moved it
    // off the page's critical path via Suspense); the other three are inline.
    for (const door of ["Board", "Intelligence", "Fantasy & Daily"]) {
      expect(page).toContain(door);
    }
    expect(labDoor).toContain("The Lab");
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
