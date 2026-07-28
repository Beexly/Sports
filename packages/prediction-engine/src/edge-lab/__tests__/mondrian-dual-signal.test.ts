import { describe, it, expect } from "vitest";
import {
  evaluateDualSignal,
  dualSignalToHonestyHints,
  type MultiprobSignal,
} from "../mondrian-dual-signal.js";
import type { QuantileLookupResult } from "../../conformal/mondrian.js";

function mp(width: number, p0 = 0.4, p1?: number): MultiprobSignal {
  const upper = p1 ?? p0 + width;
  return { p0, p1: upper, width };
}

function mondrian(
  overrides: Partial<QuantileLookupResult> = {},
): QuantileLookupResult {
  return {
    category: "home|favorite",
    quantile: 0.08,
    sampleSize: 50,
    usedFallback: false,
    fallbackChain: ["home|favorite"],
    ...overrides,
  };
}

describe("evaluateDualSignal", () => {
  it("clear when width and Mondrian residual are both calm", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.05),
      mondrian: mondrian({ quantile: 0.08 }),
      maxWidth: 0.15,
      maxMondrianQuantile: 0.2,
    });
    expect(r.verdict).toBe("clear");
    expect(r.noBet).toBe(false);
    expect(r.reasons).toEqual([]);
  });

  it("width_veto when multiprob is too wide", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.3),
      mondrian: mondrian(),
      maxWidth: 0.15,
      maxMondrianQuantile: 0.5,
    });
    expect(r.verdict).toBe("width_veto");
    expect(r.noBet).toBe(true);
    expect(r.reasons.some((s) => /width/i.test(s))).toBe(true);
  });

  it("mondrian_veto when residual quantile is too large", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.05),
      mondrian: mondrian({ quantile: 0.4 }),
      maxWidth: 0.2,
      maxMondrianQuantile: 0.15,
    });
    expect(r.verdict).toBe("mondrian_veto");
    expect(r.noBet).toBe(true);
  });

  it("both_veto when width and Mondrian both fail", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.4),
      mondrian: mondrian({ quantile: 0.5 }),
      maxWidth: 0.1,
      maxMondrianQuantile: 0.1,
    });
    expect(r.verdict).toBe("both_veto");
    expect(r.noBet).toBe(true);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("mondrian_underpowered when sample size is below floor (noBet false by default)", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.05),
      mondrian: mondrian({ sampleSize: 3, quantile: 0.01 }),
      maxWidth: 0.2,
      maxMondrianQuantile: 0.5,
      minMondrianSamples: 10,
    });
    expect(r.verdict).toBe("mondrian_underpowered");
    expect(r.noBet).toBe(false);
    expect(r.reasons.some((s) => /insufficient evidence/i.test(s))).toBe(true);
  });

  it("mondrian_unknown when Mondrian signal is omitted — unknown ≠ zero risk", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.05),
      maxWidth: 0.2,
    });
    expect(r.verdict).toBe("mondrian_unknown");
    expect(r.noBet).toBe(false);
    expect(r.mondrianQuantile).toBeNull();
    expect(r.reasons.some((s) => /unknown/i.test(s))).toBe(true);
  });

  it("recomputes width from p0/p1 when width field is inconsistent", () => {
    const r = evaluateDualSignal({
      multiprob: { p0: 0.2, p1: 0.5, width: -1 },
      maxWidth: 0.2,
    });
    expect(r.multiprobWidth).toBeCloseTo(0.3, 10);
    expect(r.verdict).toBe("width_veto");
  });

  it("records Mondrian category and fallback flag when present", () => {
    const r = evaluateDualSignal({
      multiprob: mp(0.05),
      mondrian: mondrian({
        category: "home",
        usedFallback: true,
        fallbackChain: ["home|favorite", "home"],
        sampleSize: 40,
      }),
      maxWidth: 0.2,
      maxMondrianQuantile: 0.5,
    });
    expect(r.mondrianCategory).toBe("home");
    expect(r.usedMondrianFallback).toBe(true);
    expect(r.verdict).toBe("clear");
  });
});

describe("dualSignalToHonestyHints", () => {
  it("maps hard vetoes to noBetSignal and soft states to reviewRecommended", () => {
    const veto = dualSignalToHonestyHints(
      evaluateDualSignal({
        multiprob: mp(0.5),
        maxWidth: 0.1,
      }),
    );
    expect(veto.noBetSignal).toBe(true);

    const soft = dualSignalToHonestyHints(
      evaluateDualSignal({
        multiprob: mp(0.05),
        mondrian: mondrian({ sampleSize: 2 }),
        maxWidth: 0.2,
        minMondrianSamples: 10,
      }),
    );
    expect(soft.noBetSignal).toBe(false);
    expect(soft.reviewRecommended).toBe(true);
    expect(soft.honestyFlags.length).toBeGreaterThan(0);
  });
});
