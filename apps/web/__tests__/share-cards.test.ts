import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Shareable card guard.
 *
 * PlayerCard + ResultCard are the brand's first "scored" shareable receipts.
 * They must stay brand-tokenized (signal fade + emblem), real-data-only (no
 * fabricated defaults that read as stats), and free of guarantee language.
 */

const webRoot = resolve(__dirname, "..");
/** Read a source file with comments stripped, so doc text describing a
 *  safeguard (e.g. "never a guarantee") is not mistaken for shipped copy. */
const read = (rel: string) =>
  readFileSync(resolve(webRoot, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("shareable cards", () => {
  const player = read("components/cards/player-card.tsx");
  const result = read("components/cards/result-card.tsx");

  it("carry the brand signature — signal fade + official emblem", () => {
    for (const src of [player, result]) {
      expect(src).toContain("bg-signal-fade");
      expect(src).toContain("/brand/gse-emblem.png");
    }
  });

  it("stay on design tokens, no off-system tailwind colors", () => {
    for (const src of [player, result]) {
      expect(src).not.toMatch(/\b(?:text|bg|border)-(?:gray|green|yellow|emerald|orange|red|blue)-/);
    }
  });

  it("never frame an outcome as a guarantee", () => {
    for (const src of [player, result]) {
      expect(src.toLowerCase()).not.toMatch(/guarantee|sure thing|can't lose|lock of/);
    }
  });

  it("ResultCard states results honestly (win/loss/push/pending)", () => {
    for (const r of ["WIN", "LOSS", "PUSH", "PENDING"]) {
      expect(result).toContain(r);
    }
    // Closing line value is shown as the receipt's headline second figure.
    expect(result).toContain("Closing line value");
  });

  it("PlayerCard renders passed-in real values, not invented numbers", () => {
    expect(player).toContain("headlineValue");
    expect(player).toContain("data-testid=\"player-card\"");
    // The default footnote is a label, not a fabricated stat.
    expect(player).toContain("Real, settled data");
  });
});
