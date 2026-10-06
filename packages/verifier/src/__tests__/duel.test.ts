import { describe, it, expect } from "vitest";
import path from "node:path";
import { readFileSync } from "node:fs";

import { duel, regradeVersions, DUEL_KEEP_RULE } from "../duel";
import { parsePicksH1Export, selectPicksH1, RE_GRADED_MODEL_VERSIONS } from "../holdout";
import type { HoldoutPickRow } from "../types";

const FIXTURE_PATH = path.join(__dirname, "..", "..", "fixtures", "picks-h1.json");

function fixtureRows(): HoldoutPickRow[] {
  return [...parsePicksH1Export(JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))).rows];
}

function row(over: Partial<HoldoutPickRow>): HoldoutPickRow {
  return {
    id: over.id ?? "r",
    sport: over.sport ?? "NFL",
    market: over.market ?? "MONEYLINE",
    outcome: over.outcome ?? 1,
    marketFairProb: over.marketFairProb ?? 0.55,
    modelProb: over.modelProb ?? 0.7,
    confidence: over.confidence ?? 70,
    modelVersion: over.modelVersion ?? "v5.2.7",
    generatedAt: over.generatedAt ?? "2026-09-01T00:00:00.000Z",
    isFounder: over.isFounder ?? false,
    isPublished: over.isPublished ?? true,
    isSettled: over.isSettled ?? true,
    season: over.season ?? 2026,
  };
}

describe("duel keep rule", () => {
  it("states the §4.2 rule verbatim", () => {
    expect(DUEL_KEEP_RULE).toContain("ΔBrier < 0");
    expect(DUEL_KEEP_RULE).toContain("P(better) ≥ 0.75");
  });

  it("passes when candidate is better on every row (ΔBrier < 0, P(better)=1)", () => {
    // 8 rows. Market sits at 0.55 (mild). Candidate is near the truth:
    //   y=0 → model 0.15; y=1 → model 0.85.
    // mkt Brier y=0: (0.55)²=0.3025; cand (0.15)²=0.0225
    // mkt Brier y=1: (0.45)²=0.2025; cand (0.15)²=0.0225
    // Candidate better on every row → ΔBrier < 0, P(better)=1.
    const rows = Array.from({ length: 8 }, (_, i) =>
      row({
        id: `d${i}`,
        outcome: (i % 2) as 0 | 1,
        marketFairProb: 0.55,
        modelProb: i % 2 === 1 ? 0.85 : 0.15,
      }),
    );
    const d = duel(rows, { resamples: 100, seed: 1 });
    expect(d.passesKeepRule).toBe(true);
    expect(d.scorecard.deltaBrier).toBeLessThan(0);
    expect(d.scorecard.pBetter).toBe(1);
    expect(d.holdoutId).toBe("PICKS-H1");
  });

  it("fails when candidate is worse on every row (ΔBrier > 0)", () => {
    // Market near the truth; candidate at the coin-flip middle.
    //   y=0 → mkt 0.15, cand 0.55: mkt (0.15)²=0.0225, cand (0.55)²=0.3025
    //   y=1 → mkt 0.85, cand 0.55: mkt (0.15)²=0.0225, cand (0.45)²=0.2025
    const rows = Array.from({ length: 8 }, (_, i) =>
      row({
        id: `w${i}`,
        outcome: (i % 2) as 0 | 1,
        marketFairProb: i % 2 === 1 ? 0.85 : 0.15,
        modelProb: 0.55,
      }),
    );
    const d = duel(rows, { resamples: 100, seed: 1 });
    expect(d.passesKeepRule).toBe(false);
    expect(d.scorecard.deltaBrier).toBeGreaterThan(0);
  });

  it("candidateProb override scores a proposed transform without touching stored modelProb", () => {
    // Stored modelProb is terrible; the proposed transform equals market.
    const rows = Array.from({ length: 6 }, (_, i) =>
      row({
        id: `t${i}`,
        outcome: (i % 2) as 0 | 1,
        marketFairProb: 0.6,
        modelProb: 0.9, // overconfident
      }),
    );
    const d = duel(rows, {
      resamples: 50,
      seed: 1,
      candidateLabel: "shrinkage-w=0.10",
      candidateProb: (r) => r.marketFairProb + 0.1 * (r.modelProb! - r.marketFairProb),
    });
    // Transform sits between market and model → better than raw model, still
    // not necessarily better than market. Delta must be strictly less than
    // the raw-model delta.
    const raw = duel(rows, { resamples: 50, seed: 1 });
    expect(d.scorecard.deltaBrier).toBeLessThan(raw.scorecard.deltaBrier);
    expect(d.candidateLabel).toBe("shrinkage-w=0.10");
  });
});

describe("regradeVersions (verify:holdout DoD)", () => {
  it("hand-checks that every fixture version has ΔBrier > 0 (worse than market)", () => {
    const holdout = selectPicksH1(fixtureRows());
    const versions = regradeVersions(holdout, RE_GRADED_MODEL_VERSIONS, {
      resamples: 50,
      seed: 1,
    });
    expect(versions.length).toBeGreaterThan(3);
    for (const v of versions) {
      expect(v.beatsMarket).toBe(false);
      expect(v.scorecard.harnessOk).toBe(true);
      expect(v.n).toBeGreaterThan(0);
    }
  });

  it("skips versions absent from the export (never invents a score)", () => {
    const holdout = selectPicksH1(fixtureRows());
    const versions = regradeVersions(holdout, ["v9.9.9"], { resamples: 10, seed: 1 });
    expect(versions.length).toBe(0);
  });

  it("flags a version that beats market as beatsMarket=true", () => {
    // Synthetic: one version whose modelProb is always the true side.
    const rows = [
      row({ id: "g1", outcome: 1, marketFairProb: 0.52, modelProb: 0.9, modelVersion: "vX" }),
      row({ id: "g2", outcome: 0, marketFairProb: 0.52, modelProb: 0.1, modelVersion: "vX" }),
      row({ id: "g3", outcome: 1, marketFairProb: 0.52, modelProb: 0.9, modelVersion: "vX" }),
      row({ id: "g4", outcome: 0, marketFairProb: 0.52, modelProb: 0.1, modelVersion: "vX" }),
    ];
    const versions = regradeVersions(rows, ["vX"], { resamples: 50, seed: 1 });
    expect(versions.length).toBe(1);
    expect(versions[0]!.beatsMarket).toBe(true);
    expect(versions[0]!.scorecard.harnessOk).toBe(false);
  });
});
