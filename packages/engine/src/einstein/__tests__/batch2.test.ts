import { describe, it, expect } from "vitest";
import { expectShock, diagnoseShock, SHOCK_OPERATORS } from "../shock-calculus.js";
import {
  checkUsageShareConservation,
  checkAltTailVsMedian,
  checkTdVsRole,
  checkMovementWithoutParent,
} from "../conservation-law.js";
import { buildBookGenome, type BookContextProfile } from "../book-genome.js";
import { classifyRegime, type RegimeInputs } from "../regime-topology.js";
import type { BookLeadLagProfile } from "../../market-physics/book-dna.js";

describe("Shock Calculus", () => {
  it("each shock operator carries an assumption card", () => {
    for (const k of Object.keys(SHOCK_OPERATORS)) {
      expect(SHOCK_OPERATORS[k as keyof typeof SHOCK_OPERATORS].assumptionCard.length).toBeGreaterThan(0);
    }
    expect(SHOCK_OPERATORS.false_rumor.assumptionCard.join(" ")).toMatch(/quarantine|FALSE/i);
  });

  it("diagnoses stale-book, attention-contamination, absorption, and reversion", () => {
    const exp = expectShock("inactive");
    const res = diagnoseShock(exp, [
      { market: "that_player_props", moved: false },
      { market: "opponent_unrelated_props", moved: true },
      { market: "qb_pass_yds", moved: true, directionMatches: true, magnitudeNorm: 0.2 },
      { market: "team_total", moved: true, overshoot: true },
    ]);
    const d = (m: string) => res.find((r) => r.market === m)!.diagnosis;
    expect(d("that_player_props")).toBe("stale_book");
    expect(d("opponent_unrelated_props")).toBe("attention_contaminated");
    expect(d("qb_pass_yds")).toBe("absorption");
    expect(d("team_total")).toBe("reversion");
  });
});

describe("Conservation Law Engine", () => {
  it("flags usage shares that exceed 100%", () => {
    const v = checkUsageShareConservation([{ player: "A", share: 0.7 }, { player: "B", share: 0.5 }], "carry");
    expect(v[0]!.law).toBe("usage_share");
    expect(v[0]!.severity).toBe("violation");
  });

  it("flags an alt ladder whose median diverges from the main line", () => {
    const rungs = [{ point: 50, overImplied: 0.8 }, { point: 60, overImplied: 0.55 }, { point: 65, overImplied: 0.45 }, { point: 75, overImplied: 0.2 }];
    const v = checkAltTailVsMedian(55, rungs, 3); // ladder median ≈ 63 vs main 55
    expect(v).toHaveLength(1);
    expect(v[0]!.magnitude).toBeGreaterThan(3);
  });

  it("flags TD price inconsistent with role", () => {
    const v = checkTdVsRole(0.55, 0.2, 0.2); // expected ~0.16, observed 0.55
    expect(v[0]!.severity).toBe("violation");
    expect(v[0]!.falsificationNote).toMatch(/TD-chasing|red-zone/);
  });

  it("flags market movement with no causal parent", () => {
    const v = checkMovementWithoutParent(["player_rush_yds:RB", "spread"], new Set(["spread"]));
    expect(v.map((x) => x.surfaces[0])).toEqual(["player_rush_yds:RB"]);
  });
});

describe("Book DNA Genome 2.0", () => {
  const prof = (market: string, lagMs: number, miss = 0, follow = 0.5): BookLeadLagProfile =>
    ({ book: "softbook", market, samples: 5, leadFreq: 1 - follow, followFreq: follow, medianLagMs: lagMs, missRate: miss });
  const contexts: BookContextProfile[] = [
    { marketFamily: "spread", timeToEvent: "gameday", liquidity: "deep", seasonPhase: "mid", profile: prof("spread", 30_000) },
    { marketFamily: "player_rush_yds", timeToEvent: "gameday", liquidity: "thin", seasonPhase: "mid", profile: prof("player_rush_yds", 360_000, 0.3, 0.6) },
    { marketFamily: "player_rush_yds", shockType: "injury", timeToEvent: "gameday", liquidity: "thin", seasonPhase: "mid", profile: prof("player_rush_yds", 300_000) },
  ];

  it("assembles a context-keyed lag map and infers prop slowness", () => {
    const g = buildBookGenome("softbook", contexts);
    expect(g.contextsObserved).toBe(3);
    expect(g.lagMap["player_rush_yds"]!["injury"]!.medianLagMin).toBe(5);
    expect(g.traits.propSensitivity).toBeLessThan(1); // slower on props than sides
    expect(g.traits.copycatDependency).toBeGreaterThan(0); // follows on thin markets
  });
});

describe("Regime Topology", () => {
  const base: RegimeInputs = {
    bookDispersion: 0.1, lineVelocity: 0.1, altCurvature: 0.1, liquidityProxy: 0.7, newsDensity: 0.1,
    publicAttention: 0.1, injuryUncertainty: 0.1, hoursToEvent: 48, absorptionSpeed: 0.5,
  };
  it("classifies calm consensus", () => {
    expect(classifyRegime(base).regime).toBe("CalmConsensus");
  });
  it("classifies a thin salient shock", () => {
    expect(classifyRegime({ ...base, newsDensity: 0.9, liquidityProxy: 0.15, lineVelocity: 0.8 }).regime).toBe("ThinSalientShock");
  });
  it("suppresses action in false-rumor fog", () => {
    const v = classifyRegime({ ...base, newsDensity: 0.8, injuryUncertainty: 0.9, liquidityProxy: 0.1, lineVelocity: 0.1 });
    expect(v.regime).toBe("FalseRumorFog");
    expect(v.suppressAction).toBe(true);
  });
  it("classifies pre-close compression near kickoff", () => {
    expect(classifyRegime({ ...base, hoursToEvent: 1 }).regime).toBe("PreCloseCompression");
  });
});
