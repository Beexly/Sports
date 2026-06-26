import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";
import {
  MEANING_VIEWS,
  buildMeaningPreview,
  buildObserverArena,
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
    expect(MEANING_VIEWS.length).toBe(9);
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

describe("Public Observer Arena — one observer, never official truth", () => {
  const arena = buildObserverArena();

  it("the Chronos clock chain is monotonic and lag can never imply an edge or action", () => {
    expect(arena.clockChain).toHaveLength(5);
    expect(arena.lag.canImplyEdge).toBe(false);
    expect(arena.lag.canCreateAction).toBe(false);
    // The public scoreboard is shown AFTER the event and after the official source.
    expect(arena.lag.publicScoreboardDelay).toBeGreaterThan(0);
    expect(arena.lag.publicConsensusLag).toBeGreaterThan(0);
  });

  it("observer stats are capped and can never settle", () => {
    expect(arena.stats.length).toBeGreaterThan(0);
    for (const s of arena.stats) {
      expect(s.canSettle).toBe(false);
      expect(s.authorityCeiling).toBe("WATCH");
      expect(s.visibility).toBeGreaterThanOrEqual(0);
      expect(s.visibility).toBeLessThanOrEqual(1);
    }
  });

  it("the entity ladder demonstrates DISCOVERED → ALIAS_ONLY → CANONICAL (identity, not current truth)", () => {
    const statuses = new Set(arena.entities.map((e) => e.status));
    expect(statuses.has("CANONICAL")).toBe(true);
    expect(statuses.has("ALIAS_ONLY")).toBe(true);
    expect(statuses.has("DISCOVERED")).toBe(true);
    // A kgmid alone never reaches canonical confidence.
    const discovered = arena.entities.filter((e) => e.status === "DISCOVERED");
    for (const e of discovered) expect(e.confidence).toBeLessThan(0.9);
  });

  it("highlights are rights-gated and never a public asset on UNKNOWN rights", () => {
    expect(arena.highlights.length).toBeGreaterThan(0);
    for (const h of arena.highlights) {
      expect(h.publicSafe).toBe(false);
      expect(h.fixtureWatermarked).toBe(true);
      if (h.rightsStatus === "UNKNOWN") {
        expect(h.displayAllowed).toBe(false);
        expect(h.embedAllowed).toBe(false);
        expect(h.thumbnailReusable).toBe(false);
      }
    }
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
