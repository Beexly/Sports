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

  it("keeps evidence single-family with tabular figures; display faces are headlines-only (TWO-FAMILY)", () => {
    // Law 1 — evidence sets the rendering. A figure and its sample size must sit
    // at the same optical size at n=10-29, which is unachievable across two
    // families: a figure in one face beside a caption in another reads as machine
    // output annotated by a human. IBM Plex Sans carries every DATA role, and
    // "tnum" replaces the half of the mono role that was load-bearing (column
    // alignment).
    //
    // TWO-FAMILY (owner-approved Redline Ledger) narrows — not repeals — this
    // law: display headlines and the wordmark may use the one approved display
    // face (Big Shoulders Display), because headlines never carry evidence.
    // Figures, captions, numerals and body stay IBM Plex Sans. If you are here
    // because this test failed, the question is "did evidence leave the body
    // face", not "how do I make it pass".
    //
    // Supersedes NEBULA v7 (Inter + Barlow Condensed + Chakra Petch) and, before
    // that, the Exo 2 / JetBrains Mono / Instrument Serif doctrine.

    // EXACTLY TWO families are fetched, each exactly once: IBM Plex Sans for
    // body/data and Big Shoulders Display for headlines + the wordmark alias.
    expect(layout.match(/IBM_Plex_Sans\(/g)).toHaveLength(1);
    expect(layout.match(/Big_Shoulders_Display\(/g)).toHaveLength(1);
    for (const retired of [
      "Inter",
      "Barlow_Condensed",
      "Chakra_Petch",
      "Exo_2",
      "JetBrains_Mono",
      "Instrument_Serif",
    ]) {
      // Never *called* — the family is not fetched at all. (Matched on the call
      // form so the retirement note in the file's own comments can't trip it.)
      expect(layout.match(new RegExp(`${retired}\\(`, "g")) ?? []).toHaveLength(0);
    }

    // next/font binds --f-body and --f-cond; every other family derives.
    for (const bound of ["--f-body", "--f-cond"]) {
      expect(layout).toContain(`variable: "${bound}"`);
    }
    for (const derived of [
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
    // --f-display is the single exception: headlines resolve to the condensed
    // display face, never to a data role.
    expect(tokens).toMatch(/--f-display:\s*var\(--f-cond/);

    // --f-word is the same exception and the same face: the wordmark is an
    // ALIAS to --f-cond, never a third fetched family, and never bound by
    // next/font (it resolves in the token file).
    expect(tokens).toMatch(/--f-word:\s*var\(--f-cond/);
    expect(layout).not.toContain('variable: "--f-word"');

    // The other bound variable is owned by next/font just as strictly.
    expect(tokens).not.toMatch(/^\s*--f-cond:/m);

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
    // Was "Galaxy turns it into". The FIELD rebuild rewrote the second half of
    // the thesis to "We find the signal", which is the SAME noise-to-signal
    // structure this test is named for and matches AGENTS.md's stated hero
    // thesis (Noise. / Signal. Closer: We detect. You decide.). Pin the thesis,
    // not the retired clause.
    expect(page).toContain("We find the");
    expect(page).toMatch(/>noise</);
    expect(page).toMatch(/>signal</);
    expect(page).toContain("We detect. You decide.");
    // ONE cold-open: the Field intro replaced the montage (96e505471 hero,
    // 417fa6ae3 strip) with a lighter canvas sting that downloads no video
    // (F-24 media weight). The intent of this line is unchanged — exactly one
    // self-gating cold-open — so it pins the live intro and keeps the retired
    // ones retired.
    expect(page).toContain("FieldCinematicIntro");
    expect(page).not.toContain("MontageEntrance");
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
