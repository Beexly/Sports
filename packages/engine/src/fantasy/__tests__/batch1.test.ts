import { describe, it, expect } from "vitest";
import { roleQualityIndex, roleVsProduction, type FantasyRoleStateVector } from "../fantasy-role-state-vector.js";
import { evaluateFantasyLightCone } from "../fantasy-light-cone.js";
import { redistributeRoleMass, type VacatedRole, type Inheritor } from "../role-mass-transfer-engine.js";
import { checkFantasyConservation, findFantasyIncoherences } from "../fantasy-conservation-engine.js";
import { absorptionLag, rankSurfacesBySlowness, absorptionHalfLife, type SurfaceReaction } from "../fantasy-absorption-half-life.js";
import { formatAdjustedValue, valueAcrossFormats, type PlayerValueProfile } from "../fantasy-format-relativity.js";

const eliteWR: FantasyRoleStateVector = {
  snapProbability: 0.95, routeRate: 0.92, targetShare: 0.28, airYardShare: 0.35, carryShare: 0,
  highValueTouchShare: 0.3, redZoneShare: 0.25, goalLineShare: 0.1, twoMinuteRole: 0.9, thirdDownRole: 0.8,
  passBlockRisk: 0, explosiveTail: 0.6, gameScriptElasticity: 0.8, injuryFragility: 0.1, coachingTrust: 0.9,
  teammateDependency: 0.2, replacementPressure: 0.1, marketAttention: 0.5,
};

describe("Fantasy Role State Vector", () => {
  it("scores an elite WR role as a feature tier", () => {
    const q = roleQualityIndex(eliteWR, "WR");
    expect(q.tier).toBe("feature");
    expect(q.index).toBeGreaterThan(0.7);
  });
  it("detects a silent breakout (high role, low production)", () => {
    expect(roleVsProduction(0.8, 0.3).signal).toBe("silent_breakout");
  });
  it("detects box-score fraud (low role, high production)", () => {
    expect(roleVsProduction(0.25, 0.85).signal).toBe("box_score_fraud");
  });
});

describe("Fantasy Light Cone", () => {
  const base = { lock: "waiver_deadline" as const, lockTime: "2026-01-07T08:00:00Z", infoFirstKnowableTime: "2026-01-05T13:00:00Z" };
  it("certifies a knowable, pre-lock decision as inside the cone", () => {
    const v = evaluateFantasyLightCone({ ...base, decisionTime: "2026-01-06T10:00:00Z" });
    expect(v.status).toBe("INSIDE_LIGHT_CONE");
    expect(v.actionableBeforeLock).toBe(true);
  });
  it("refuses to credit a post-lock decision", () => {
    const v = evaluateFantasyLightCone({ ...base, decisionTime: "2026-01-07T12:00:00Z" });
    expect(v.status).toBe("POST_LOCK_ONLY");
    expect(v.actionableBeforeLock).toBe(false);
  });
  it("flags hindsight leakage from post-decision data", () => {
    const v = evaluateFantasyLightCone({ ...base, decisionTime: "2026-01-06T10:00:00Z", usedDataTimestamps: ["2026-01-06T15:00:00Z"] });
    expect(v.status).toBe("CONTAMINATED");
  });
  it("marks knowledge claimed before the source existed as outside the cone", () => {
    const v = evaluateFantasyLightCone({ ...base, decisionTime: "2026-01-05T09:00:00Z" });
    expect(v.status).toBe("OUTSIDE_LIGHT_CONE");
  });
});

describe("Role Mass Transfer", () => {
  const vacated: VacatedRole = { targets: 0.25, carries: 0, routes: 0.3, redZoneTouches: 0.2, goalLineTouches: 0.15, airYards: 0.3, checkdownShare: 0.1 };
  const inheritors: Inheritor[] = [
    { id: "slotWR", roleSimilarity: 0.8, coachingTrust: 0.8, fit: { pass: 0.9, rush: 0, redZone: 0.5, deep: 0.4, checkdown: 0.6 } },
    { id: "boundaryWR", roleSimilarity: 0.6, coachingTrust: 0.6, fit: { pass: 0.6, rush: 0, redZone: 0.7, deep: 0.9, checkdown: 0.2 } },
  ];
  it("redistributes vacated targets net of leakage and names exactly one valuable-core inheritor", () => {
    const r = redistributeRoleMass(vacated, inheritors, { passLean: 0.6, teamLevelLeakage: 0.2 });
    expect(r.allocations).toHaveLength(2);
    const totalTargets = r.allocations.reduce((s, a) => s + a.inheritedTargets, 0);
    expect(totalTargets).toBeCloseTo(0.25 * 0.8, 2); // 80% retained on-roster
    expect(r.leakage).toBe(0.2);
    expect(r.allocations.filter((a) => a.note.includes("valuable (RZ")).length).toBe(1);
  });
});

describe("Fantasy Conservation Engine", () => {
  it("flags ownership-without-role as a high incoherence", () => {
    const v = checkFantasyConservation({ kind: "ownership_without_role", claimedMove: 0.8, support: 0.2, sampleQuality: 0.9 });
    expect(v.severity).toBe("high");
    expect(v.real).toBe(true);
  });
  it("treats thin-sample moves as noise, not violations", () => {
    const v = checkFantasyConservation({ kind: "rank_without_support", claimedMove: 0.8, support: 0.1, sampleQuality: 0.2 });
    expect(v.real).toBe(false);
    expect(v.severity).toBe("none");
  });
  it("returns only real, non-trivial violations, worst-first", () => {
    const out = findFantasyIncoherences([
      { kind: "vacuum_not_redistributed", claimedMove: 0.6, support: 0.1, sampleQuality: 0.9 },
      { kind: "projection_ignores_shock", claimedMove: 0.9, support: 0.1, sampleQuality: 0.9 },
      { kind: "rank_without_support", claimedMove: 0.3, support: 0.28, sampleQuality: 0.9 },
    ]);
    expect(out[0]!.kind).toBe("projection_ignores_shock");
    expect(out.find((v) => v.kind === "rank_without_support")).toBeUndefined();
  });
});

describe("Fantasy Absorption Half-Life", () => {
  const reactions: SurfaceReaction[] = [
    { surface: "sportsbook_prop", reactionTime: "2026-01-05T13:30:00Z", truthTime: "2026-01-05T13:00:00Z" },
    { surface: "analyst_rank", reactionTime: "2026-01-06T09:00:00Z", truthTime: "2026-01-05T13:00:00Z" },
  ];
  it("computes per-surface lag and ranks slow absorbers first", () => {
    const ranked = rankSurfacesBySlowness(reactions);
    expect(ranked[0]!.surface).toBe("analyst_rank");
    expect(absorptionLag(reactions[0]!).lagMinutes).toBe(30);
  });
  it("estimates a half-life by interpolation", () => {
    const hl = absorptionHalfLife([
      { minutesSinceTruth: 0, valueGapRemaining: 1 },
      { minutesSinceTruth: 60, valueGapRemaining: 0.6 },
      { minutesSinceTruth: 120, valueGapRemaining: 0.4 },
    ]);
    expect(hl.halfLifeMinutes).toBeGreaterThan(60);
    expect(hl.halfLifeMinutes).toBeLessThan(120);
  });
});

describe("Fantasy Format Relativity", () => {
  const passCatchingRB: PlayerValueProfile = { position: "RB", receptionsPerGame: 5, age: 25, volatility: 0.4, ceiling: 0.6, fragility: 0.3, roleDurability: 0.7 };
  it("boosts a pass-catching back in full PPR over standard", () => {
    expect(formatAdjustedValue(100, "full_ppr", passCatchingRB).adjustedValue)
      .toBeGreaterThan(formatAdjustedValue(100, "standard", passCatchingRB).adjustedValue);
  });
  it("applies a large superflex premium to QBs", () => {
    const qb: PlayerValueProfile = { position: "QB", receptionsPerGame: 0, age: 27, volatility: 0.3, ceiling: 0.7, fragility: 0.2, roleDurability: 0.8 };
    expect(formatAdjustedValue(100, "superflex", qb).multiplier).toBeGreaterThan(1.5);
  });
  it("ranks formats by adjusted value", () => {
    const r = valueAcrossFormats(100, passCatchingRB, ["standard", "full_ppr", "half_ppr"]);
    expect(r[0]!.format).toBe("full_ppr");
  });
});
