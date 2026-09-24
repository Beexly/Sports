import { describe, expect, it } from "vitest";
import {
  eventWinProb,
  nextScoreProb,
  updateDynamicsCoeffs,
} from "./antipersistent-scoring";

const base = { offA: 0.2, defB: 0.1, offB: 0.1, defA: 0.1, restore: 0.02, antipersist: -0.3 };

describe("antipersistent-scoring", () => {
  it("stronger offense scores next more often", () => {
    const strong = nextScoreProb({ ...base, offA: 1.5 }, 0, false);
    const weak = nextScoreProb({ ...base, offA: -1.5 }, 0, false);
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(0.5);
  });

  it("anti-persistence: the last scorer is less likely to repeat", () => {
    const repeat = nextScoreProb(base, 0, true);
    const fresh = nextScoreProb(base, 0, false);
    expect(repeat).toBeLessThan(fresh);
  });

  it("restoration: the trailing team gets a urgency bump", () => {
    const trailing = nextScoreProb(base, -14, false);
    const leading = nextScoreProb(base, 14, false);
    expect(trailing).toBeGreaterThan(leading);
  });

  it("event WP blends model and pregame anchor", () => {
    const wp = eventWinProb(base, 0, false, 0.7, 12);
    expect(wp).toBeGreaterThan(0.5);
    expect(wp).toBeLessThan(0.7);
    expect(eventWinProb(base, 7, false, 0.5, 0)).toBe(1);
    expect(() => eventWinProb(base, 0, false, 0, 5)).toThrow();
  });

  it("online update moves coefficients toward the observed event", () => {
    const before = { ...base };
    const after = updateDynamicsCoeffs(base, -10, false, true, 0.1);
    // A scored while trailing: restoration evidence -> restore increases
    expect(after.restore).toBeGreaterThan(before.restore);
  });
});
