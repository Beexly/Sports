import { describe, expect, it } from "vitest";
import {
  anytimeTdProbability,
  conditionalAnytimeTd,
  integrateEv,
  rollingRoleFeatures,
  type PlayerRoleContext,
} from "./anytime-td-mit.js";

function ctx(over: Partial<PlayerRoleContext> = {}): PlayerRoleContext {
  return {
    playerId: "p1",
    season: 2026,
    week: 5,
    position: "RB",
    isHome: true,
    rolling: {
      windowGames: 4,
      snapShare: 0.62,
      redZoneShare: 0.35,
      usageShare: 0.28,
      teamPlaysPerGame: 62,
      oppTdRateAllowed: 1.2,
    },
    injuryStatus: "HEALTHY",
    ...over,
  };
}

describe("W4 anytimeTdProbability", () => {
  it("returns a probability in (0,1) with real features", () => {
    const r = anytimeTdProbability(ctx());
    expect(r.failClosed).toBe(false);
    expect(r.probability).toBeGreaterThan(0);
    expect(r.probability).toBeLessThan(1);
    expect(r.fairOdds).toBeCloseTo(1 / r.probability, 1);
    expect(r.featuresUsed).toContain("snapShare");
  });

  it("fails closed on missing snapShare — never imputes", () => {
    const r = anytimeTdProbability(
      ctx({ rolling: { ...ctx().rolling, snapShare: null } }),
    );
    expect(r.failClosed).toBe(true);
    expect(r.reason).toContain("snapShare");
  });

  it("fails closed on missing redZoneShare", () => {
    const r = anytimeTdProbability(
      ctx({ rolling: { ...ctx().rolling, redZoneShare: null } }),
    );
    expect(r.failClosed).toBe(true);
    expect(r.reason).toContain("redZoneShare");
  });

  it("fails closed on null context", () => {
    expect(anytimeTdProbability(null).failClosed).toBe(true);
    expect(anytimeTdProbability(undefined).failClosed).toBe(true);
  });

  it("OUT injury zeros probability", () => {
    const r = anytimeTdProbability(ctx({ injuryStatus: "OUT" }));
    expect(r.failClosed).toBe(false);
    expect(r.probability).toBeGreaterThan(0);
    expect(r.probability).toBeLessThan(0.01);
  });

  it("higher snap share raises probability", () => {
    const low = anytimeTdProbability(
      ctx({ rolling: { ...ctx().rolling, snapShare: 0.3 } }),
    );
    const high = anytimeTdProbability(
      ctx({ rolling: { ...ctx().rolling, snapShare: 0.9 } }),
    );
    expect(high.probability).toBeGreaterThan(low.probability);
  });

  it("QB base rate is below RB", () => {
    const rb = anytimeTdProbability(ctx({ position: "RB" }));
    const qb = anytimeTdProbability(ctx({ position: "QB" }));
    expect(qb.probability).toBeLessThan(rb.probability);
  });
});

describe("W4 integrateEv", () => {
  it("computes EV = p * odds − 1", () => {
    const r = anytimeTdProbability(ctx());
    const withEv = integrateEv(r, { decimalOdds: 2.5 });
    expect(withEv.ev).not.toBeNull();
    expect(withEv.ev!).toBeCloseTo(r.probability * 2.5 - 1, 3);
  });

  it("fails closed on missing odds", () => {
    const r = anytimeTdProbability(ctx());
    expect(integrateEv(r, null).ev).toBeNull();
    expect(integrateEv(r, { decimalOdds: null }).ev).toBeNull();
    expect(integrateEv(r, { decimalOdds: 1 }).ev).toBeNull();
    expect(integrateEv(r, { decimalOdds: 0.5 }).ev).toBeNull();
  });

  it("passes through fail-closed results", () => {
    const bad = anytimeTdProbability(null);
    expect(integrateEv(bad, { decimalOdds: 2 }).failClosed).toBe(true);
    expect(integrateEv(bad, { decimalOdds: 2 }).ev).toBeNull();
  });
});

describe("W4 rollingRoleFeatures", () => {
  it("uses only weeks strictly before asOfWeek", () => {
    const logs = [
      { week: 1, snapShare: 0.5, redZoneShare: 0.2, usageShare: 0.2, teamPlays: 60 },
      { week: 2, snapShare: 0.6, redZoneShare: 0.3, usageShare: 0.3, teamPlays: 62 },
      { week: 3, snapShare: 0.7, redZoneShare: 0.4, usageShare: 0.4, teamPlays: 64 },
      { week: 4, snapShare: 0.99, redZoneShare: 0.99, usageShare: 0.99, teamPlays: 80 },
    ];
    const r = rollingRoleFeatures(logs, 4, 4);
    // Week 4 is NOT included (asOfWeek=4)
    expect(r.windowGames).toBe(3);
    expect(r.snapShare!).toBeCloseTo(0.6, 5);
    expect(r.redZoneShare!).toBeCloseTo(0.3, 5);
  });

  it("returns null for missing columns — never imputes", () => {
    const logs = [
      { week: 1, snapShare: null, redZoneShare: null, usageShare: null, teamPlays: null },
    ];
    const r = rollingRoleFeatures(logs, 2);
    expect(r.snapShare).toBeNull();
    expect(r.redZoneShare).toBeNull();
    expect(r.usageShare).toBeNull();
    expect(r.teamPlaysPerGame).toBeNull();
    expect(r.windowGames).toBe(1);
  });
});

describe("W4 conditionalAnytimeTd", () => {
  it("blends role model with conditional marginalization", () => {
    const r = conditionalAnytimeTd(ctx(), {
      targetProbs: [0.5, 0.3, 0.2],
      tdGivenTarget: [0.12, 0.08, 0.05],
    });
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });

  it("fails closed when role model fails", () => {
    const bad = ctx({ rolling: { ...ctx().rolling, snapShare: null } });
    expect(
      Number.isNaN(
        conditionalAnytimeTd(bad, {
          targetProbs: [0.5, 0.5],
          tdGivenTarget: [0.1, 0.2],
        }),
      ),
    ).toBe(true);
  });
});
