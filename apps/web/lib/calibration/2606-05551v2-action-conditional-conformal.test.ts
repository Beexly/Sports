import { describe, expect, it } from "vitest";

import {
  ENABLED,
  STAKE_TIER_FRACTIONS,
  actionConditionalCoverage,
  profitFloorCertificate,
  selectStakeTier,
  volumeGateOk,
} from "@/lib/calibration/2606-05551v2-action-conditional-conformal";

describe("action-conditional conformal bet filter", () => {
  it("is disabled by default; four stake tiers", () => {
    expect(ENABLED).toBe(false);
    expect(STAKE_TIER_FRACTIONS).toEqual([0, 0.25, 0.5, 1]);
  });

  it("certificate gives ~95% action-conditional coverage", () => {
    let s = 55;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const calib = Array.from({ length: 500 }, () => {
      const exp = 0.1 + rnd() * 0.2;
      const realized = exp + (rnd() - 0.5) * 0.4;
      return { expectedProfit: exp, realizedProfit: realized };
    });
    const { nu, nCal } = profitFloorCertificate(calib, 0.05);
    expect(nCal).toBe(500);
    expect(Number.isFinite(nu)).toBe(true);
    // coverage check on a fresh sample from the same DGP
    const fresh = Array.from({ length: 2000 }, () => {
      const exp = 0.1 + rnd() * 0.2;
      return { expectedProfit: exp, realizedProfit: exp + (rnd() - 0.5) * 0.4 };
    });
    const q = -nu;
    const cov = actionConditionalCoverage(fresh, q);
    expect(cov).toBeGreaterThanOrEqual(0.93); // gate: >=95% nominal, allow sim noise
  });

  it("max-min rule picks the largest tier with positive certified utility", () => {
    // expected profit 0.2, shortfall quantile 0.05 -> floor positive at all tiers.
    const d = selectStakeTier(0.1, 0.2, 0.05);
    expect(d.tierFraction).toBe(1);
    expect(d.stake).toBeCloseTo(0.1, 10);
    expect(d.certifiedFloor).toBeGreaterThan(0);
    // shortfall wipes out the edge -> sit out.
    const d2 = selectStakeTier(0.1, 0.02, 0.05);
    expect(d2.tierFraction).toBe(0);
  });

  it("volume gate requires >= 30% of baseline", () => {
    expect(volumeGateOk(35, 100)).toBe(true);
    expect(volumeGateOk(29, 100)).toBe(false);
  });
});
