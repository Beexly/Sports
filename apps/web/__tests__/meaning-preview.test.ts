import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";
import {
  MEANING_VIEWS,
  buildMeaningPreview,
  resolveMeaningView,
} from "@/lib/meaning/meaning-preview";

/**
 * /meaning/preview — the M10 instrument-grade slice. Two guarantees:
 *  1) the preview is assembled purely from the canonical engine and is honest on fixtures (every claim
 *     INFO_ONLY, watermarked, nothing publicSafe);
 *  2) the surface's public copy — in the shared view component, outside the auto-scanned page set —
 *     carries no banned phrases.
 */

const repoRoot = resolve(__dirname, "..");

describe("Meaning preview — engine-driven, honest on fixtures", () => {
  it("every view resolves and the corpus is fixture-capped", () => {
    expect(MEANING_VIEWS.length).toBe(8);
    for (const v of MEANING_VIEWS) {
      const p = buildMeaningPreview(v.value);
      expect(p.counts.total).toBeGreaterThan(40);
      // every compiled object is INFO_ONLY on fixtures (or refused), and nothing is publicSafe
      for (const c of p.corpus) {
        expect(c.fixtureWatermarked).toBe(true);
        expect(c.publicSafe).toBe(false);
        expect(c.publicExpression).toBe("INFO_ONLY");
      }
    }
  });

  it("each non-lens view only shows claims of its declared types", () => {
    for (const v of MEANING_VIEWS.filter((x) => x.value !== "lenses")) {
      const p = buildMeaningPreview(v.value);
      for (const c of p.claims) expect(v.types).toContain(c.objectType);
    }
  });

  it("the lenses view exposes all eight instruments", () => {
    const p = buildMeaningPreview("lenses");
    expect(p.lenses).toHaveLength(8);
  });

  it("resolveMeaningView falls back safely", () => {
    expect(resolveMeaningView(undefined)).toBe("stats");
    expect(resolveMeaningView("not-a-view")).toBe("stats");
    expect(resolveMeaningView("lenses")).toBe("lenses");
  });
});

describe("Meaning preview — public copy is clean", () => {
  const FILES = [
    "components/meaning/meaning-preview-view.tsx",
    "lib/meaning/meaning-preview.ts",
    "lib/meaning/rights-snapshot-to-envelope.ts",
    "app/meaning/preview/page.tsx",
  ];
  for (const file of FILES) {
    it(`${file} carries no banned phrases`, () => {
      const hits = scanForBannedPhrases(readFileSync(resolve(repoRoot, file), "utf8"));
      if (hits.length > 0) throw new Error(`${file}: ${hits.map((h) => `${h.line}:"${h.phrase}"`).join(", ")}`);
      expect(hits.length).toBe(0);
    });
  }
});
