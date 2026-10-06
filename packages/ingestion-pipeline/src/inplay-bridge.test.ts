import { describe, expect, it } from "vitest";
import {
  buildTeamBalance,
  evalInPlayWp,
  evalMixedTier,
  evalNextScore,
} from "./inplay-bridge.js";

const scoring = {
  offA: 0.3,
  offB: 0.1,
  defA: 0.05,
  defB: 0.15,
  restore: 0.08,
  antipersist: 0.2,
};

const balance = buildTeamBalance(-3, 0.55, 0.02);
if (!balance.ok) throw new Error("balance factory should work");
const chain = {
  tempo: 1.2,
  balanceAt: balance.balanceAt,
  pointsPerEvent: 7,
};

describe("inplay-bridge evalNextScore", () => {
  it("fail-closes on non-finite params", () => {
    const r = evalNextScore({ ...scoring, offA: Number.NaN }, 0, false);
    expect(r.ok).toBe(false);
  });

  it("returns a next-score probability in (0,1)", () => {
    const r = evalNextScore(scoring, 0, false);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pNext).toBeGreaterThan(0);
      expect(r.pNext).toBeLessThan(1);
    }
  });

  it("antipersist shifts the next-score probability after a score", () => {
    const afterScore = evalNextScore(scoring, 0, true);
    const noScore = evalNextScore(scoring, 0, false);
    expect(afterScore.ok && noScore.ok).toBe(true);
    if (afterScore.ok && noScore.ok) {
      expect(afterScore.pNext).not.toBeCloseTo(noScore.pNext, 6);
    }
  });
});

describe("inplay-bridge evalInPlayWp", () => {
  it("fail-closes on bad inputs", () => {
    const r = evalInPlayWp({
      params: chain,
      currentLead: Number.NaN,
      eventsLeft: 5,
    });
    expect(r.ok).toBe(false);
  });

  it("returns a win probability", () => {
    const r = evalInPlayWp({ params: chain, currentLead: 7, eventsLeft: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.wp).toBeGreaterThanOrEqual(0);
      expect(r.wp).toBeLessThanOrEqual(1);
    }
  });

  it("lead is worth more with fewer events left", () => {
    const late = evalInPlayWp({ params: chain, currentLead: 7, eventsLeft: 2 });
    const early = evalInPlayWp({ params: chain, currentLead: 7, eventsLeft: 20 });
    expect(late.ok && early.ok).toBe(true);
    if (late.ok && early.ok) expect(late.wp).toBeGreaterThanOrEqual(early.wp);
  });
});

describe("inplay-bridge evalMixedTier", () => {
  it("fail-closes on too-few games", () => {
    const r = evalMixedTier({ games: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("tiered games");
  });

  it("trains a tier-weighted logistic and reports per-tier Brier", () => {
    const games = Array.from({ length: 40 }, (_, i) => ({
      features: [i % 3, (i % 5) * 0.2],
      homeWin: (i % 2) as 0 | 1,
      tier: (i % 4 === 0 ? "playoff" : "regular") as "regular" | "playoff",
    }));
    const r = evalMixedTier({ games, iters: 20, playoffWeight: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.beta.length).toBeGreaterThan(0);
      expect(Number.isFinite(r.brierRegular)).toBe(true);
    }
  });
});

describe("inplay-bridge buildTeamBalance", () => {
  it("returns a balance function", () => {
    const r = buildTeamBalance(-3, 0.55, 0.02);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const b = r.balanceAt(7);
      expect(b).toBeGreaterThanOrEqual(0.05);
      expect(b).toBeLessThanOrEqual(0.95);
    }
  });

  it("fail-closes on non-finite spread", () => {
    const r = buildTeamBalance(Number.NaN);
    expect(r.ok).toBe(false);
  });
});
