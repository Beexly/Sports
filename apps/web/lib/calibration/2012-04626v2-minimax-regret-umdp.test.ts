import { describe, expect, it } from "vitest";

import {
  ENABLED,
  STAKE_TIERS,
  makeWorld,
  maxWorldRegret,
  minimaxRegretPolicy,
  regretAuditLog,
  worldRegret,
} from "@/lib/calibration/2012-04626v2-minimax-regret-umdp";

describe("minimax-regret UMDP staking", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
    expect(STAKE_TIERS).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it("oracle policy has zero regret in its own world", () => {
    const w = makeWorld("w1", (b, e, t) => (t === 4 ? 10 : t));
    const oraclePolicy = { policy: w.value.map((bs) => bs.map((es) => es.indexOf(Math.max(...es)))) };
    expect(worldRegret(w, oraclePolicy)).toBeCloseTo(0, 10);
  });

  it("minimax-regret policy minimizes the worst world regret", () => {
    // World A rewards aggression, world B punishes it: the robust policy hedges.
    const wA = makeWorld("normal", (_b, _e, t) => STAKE_TIERS[t] * 2);
    const wB = makeWorld("chaotic", (_b, _e, t) => (t >= 3 ? -5 : STAKE_TIERS[t]));
    const policy = minimaxRegretPolicy([wA, wB]);
    const worst = maxWorldRegret([wA, wB], policy);
    // Pure aggression (tier 4 everywhere) has worst regret 5+ per state in world B.
    const aggro = { policy: wA.value.map((bs) => bs.map(() => 4)) };
    expect(maxWorldRegret([wA, wB], aggro)).toBeGreaterThan(worst);
    // Policy table has valid tier indices.
    expect(policy.policy.flat().every((t) => t >= 0 && t < STAKE_TIERS.length)).toBe(true);
  });

  it("regret audit log attributes regret per world", () => {
    const wA = makeWorld("a", (_b, _e, t) => t);
    const wB = makeWorld("b", (_b, _e, t) => 4 - t);
    const policy = minimaxRegretPolicy([wA, wB]);
    const log = regretAuditLog([wA, wB], policy);
    expect(log.length).toBe(2);
    expect(log.every((x) => x.regret >= -1e-9)).toBe(true);
    expect(log.reduce((a, x) => a + x.worldId.length, 0)).toBeGreaterThan(0);
  });
});
