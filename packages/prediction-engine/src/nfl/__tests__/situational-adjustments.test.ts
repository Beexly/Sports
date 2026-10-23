import { describe, expect, it } from "vitest";
import { applySituationalAdjustments, situationalExplosiveRate } from "../situational-adjustments";

const VICTORY = { secondsRemaining: 55, scoreDifferential: 7, opponentTimeouts: 0, quarter: 4 } as const;

describe("null safety", () => {
  it("passes a null projection through without imputing", () => {
    const r = applySituationalAdjustments({ qbRushYards: null, victoryFormation: VICTORY });
    expect(r.qbRushYards).toBeNull();
    expect(r.adjustments).toHaveLength(0);
  });

  it("does nothing without a victory-formation state", () => {
    const r = applySituationalAdjustments({ qbRushYards: 25 });
    expect(r.qbRushYards).toBe(25);
    expect(r.inert).toContain("kneeldown_haircut");
  });

  it("returns null explosive rate when no base is given", () => {
    expect(situationalExplosiveRate({ safetiesOut: 1 })).toBeNull();
  });
});

describe("kneeldown application", () => {
  it("haircuts a QB rush projection in victory formation", () => {
    const r = applySituationalAdjustments({ qbRushYards: 30, victoryFormation: VICTORY });
    expect(r.qbRushYards).not.toBeNull();
    expect(r.qbRushYards as number).toBeLessThan(30);
    expect(r.adjustments.map((a) => a.key)).toContain("kneeldown_haircut");
  });

  it("haircut is bounded — never the naive -2.5 flat", () => {
    const r = applySituationalAdjustments({ qbRushYards: 30, victoryFormation: VICTORY });
    const delta = (r.qbRushYards as number) - 30;
    expect(delta).toBeGreaterThan(-3);
    expect(delta).toBeLessThan(0);
  });
});

describe("explosive adjustment", () => {
  it("lowers the rate when safeties are out (reversed sign)", () => {
    const r = applySituationalAdjustments({
      baseExplosiveRate: 0.18,
      safetiesOut: 1,
    });
    expect(r.explosiveMultiplier).toBeLessThan(1);
    expect(situationalExplosiveRate({ baseExplosiveRate: 0.18, safetiesOut: 1 }) as number).toBeLessThan(
      0.18,
    );
  });

  it("is a no-op with no safeties out", () => {
    const r = applySituationalAdjustments({ baseExplosiveRate: 0.18, safetiesOut: 0 });
    expect(r.explosiveMultiplier).toBe(1);
  });

  it("applies half the measured effect because the weight is 0.5", () => {
    const full = 1 - 0.0258 / 0.1822;
    const r = applySituationalAdjustments({ baseExplosiveRate: 0.1822, safetiesOut: 1 });
    expect(r.explosiveMultiplier).toBeCloseTo(1 + (full - 1) * 0.5, 6);
  });
});

describe("inert terms are reported, not applied", () => {
  it("lists the OL penalty when linemen are out and does not move the projection", () => {
    const r = applySituationalAdjustments({ qbRushYards: 20, interiorLinemenOut: 2 });
    expect(r.inert).toContain("interior_ol_penalty");
    expect(r.qbRushYards).toBe(20);
  });

  it("lists the ILB override when linebackers are out", () => {
    const r = applySituationalAdjustments({ qbRushYards: 20, insideLinebackersOut: 2 });
    expect(r.inert).toContain("mutual_ilb_cb_override");
  });
});
