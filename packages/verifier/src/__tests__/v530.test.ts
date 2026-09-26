import { describe, it, expect } from "vitest";
import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";

import {
  V530_CANDIDATE_FACTOR_REVIEW,
  V530_SHRINKAGE_W,
  buildV530DuelVsMarket,
  buildV530VsV527,
  v530CandidateProb,
} from "../candidates/v530";
import { parsePicksH1Export } from "../holdout";
import type { HoldoutPickRow } from "../types";

const FIXTURE_PATH = path.join(__dirname, "..", "..", "fixtures", "picks-h1.json");
const FACTORS_DIR = path.join(__dirname, "..", "..", "..", "..", "docs", "factors");

function fixtureRows(): HoldoutPickRow[] {
  return [...parsePicksH1Export(JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))).rows];
}

/** Read docs/factors/*.yaml directly for the live CANDIDATE id set — never hardcode a snapshot. */
function liveCandidateIds(): string[] {
  const ids: string[] = [];
  for (const f of readdirSync(FACTORS_DIR)) {
    if (!/^[A-Z][0-9]+\.yaml$/.test(f)) continue;
    const text = readFileSync(path.join(FACTORS_DIR, f), "utf8");
    if (/^status:\s*CANDIDATE\s*$/m.test(text)) {
      ids.push(f.replace(/\.yaml$/, ""));
    }
  }
  return ids.sort();
}

describe("v530 candidate", () => {
  it("matches the A2 shrinkage formula exactly", () => {
    const row: HoldoutPickRow = {
      id: "r1",
      sport: "NFL",
      market: "MONEYLINE",
      outcome: 1,
      marketFairProb: 0.6,
      modelProb: 0.9,
      confidence: 90,
      modelVersion: "v5.2.7",
      generatedAt: "2026-09-01T00:00:00.000Z",
      isFounder: false,
      isPublished: true,
      isSettled: true,
      season: 2026,
    };
    expect(v530CandidateProb(row)).toBeCloseTo(0.6 + V530_SHRINKAGE_W * (0.9 - 0.6), 10);
  });

  it("returns null when no modelProb is stored (held rows never imputed)", () => {
    const row: HoldoutPickRow = {
      id: "held",
      sport: "NFL",
      market: "SPREAD",
      outcome: 0,
      marketFairProb: 0.55,
      modelProb: null,
      confidence: 70,
      modelVersion: "v5.2.7",
      generatedAt: "2026-09-09T00:00:00.000Z",
      isFounder: false,
      isPublished: true,
      isSettled: true,
      season: 2026,
    };
    expect(v530CandidateProb(row)).toBeNull();
  });

  it("every currently-CANDIDATE docs/factors/*.yaml row is reviewed and excluded with a stated reason", () => {
    const live = liveCandidateIds();
    const reviewed = V530_CANDIDATE_FACTOR_REVIEW.map((r) => r.id).sort();
    expect(reviewed).toEqual(live);
    for (const r of V530_CANDIDATE_FACTOR_REVIEW) {
      expect(r.includedInV530).toBe(false);
      expect(r.reasonExcluded).toBeTruthy();
    }
  });

  it("duels the candidate against market on the committed PICKS-H1 fixture (real numbers, not invented)", () => {
    const result = buildV530DuelVsMarket(fixtureRows(), { resamples: 200, seed: 20260915 });
    expect(result.holdoutId).toBe("PICKS-H1");
    expect(result.scorecard.n).toBeGreaterThan(0);
    expect(Number.isFinite(result.scorecard.deltaBrier)).toBe(true);
    expect(result.keepRule).toContain("ΔBrier < 0");
  });

  it("scores the candidate against v5.2.7's own stored modelProb on the fixture", () => {
    const result = buildV530VsV527(fixtureRows(), { resamples: 200, seed: 20260915 });
    expect(result.n).toBeGreaterThan(0);
    expect(Number.isFinite(result.deltaBrier)).toBe(true);
  });
});
