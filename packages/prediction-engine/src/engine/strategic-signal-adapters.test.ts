import { describe, expect, it } from "vitest";
import {
  anchorWeightAdapter,
  coverProbabilityAdapter,
  fgMakeProbabilityAdapter,
  generalizedPoissonAdapter,
  lsSpreadAdapter,
  passerRatingAllowedAdapter,
  pinballLossAdapter,
  STRATEGIC_ADAPTERS,
} from "./strategic-signal-adapters.js";
import { isFailClosed, isObservation } from "./universal-adapter.js";
import type { LsFit } from "../ratings/least-squares-ratings.js";

describe("strategic-signal-adapters registry", () => {
  it("exposes every adapter", () => {
    expect(Object.keys(STRATEGIC_ADAPTERS)).toEqual([
      "coverProbability",
      "pinballLoss",
      "lsSpread",
      "anchorWeight",
      "fgMakeProbability",
      "passerRatingAllowed",
      "generalizedPoisson",
    ]);
  });
});

describe("coverProbabilityAdapter", () => {
  it("returns cover probability in (0,1)", () => {
    const r = coverProbabilityAdapter({ spread: -3, projectedMargin: 3 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(typeof r.value).toBe("number");
      expect(r.value as number).toBeGreaterThan(0);
      expect(r.value as number).toBeLessThan(1);
    }
  });

  it("fails closed on missing input", () => {
    expect(isFailClosed(coverProbabilityAdapter(null))).toBe(true);
    expect(isFailClosed(coverProbabilityAdapter({ spread: Number.NaN, projectedMargin: 1 }))).toBe(
      true,
    );
  });
});

describe("pinballLossAdapter", () => {
  it("computes pinball loss", () => {
    const r = pinballLossAdapter({ y: 10, q: 12, tau: 0.5 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeCloseTo(1, 5);
  });

  it("fails closed on tau outside (0,1)", () => {
    expect(isFailClosed(pinballLossAdapter({ y: 1, q: 1, tau: 0 }))).toBe(true);
    expect(isFailClosed(pinballLossAdapter({ y: 1, q: 1, tau: 1 }))).toBe(true);
    expect(isFailClosed(pinballLossAdapter(null))).toBe(true);
  });
});

describe("lsSpreadAdapter", () => {
  it("fails closed without a fit", () => {
    expect(isFailClosed(lsSpreadAdapter(null))).toBe(true);
    expect(isFailClosed(lsSpreadAdapter({ fit: null, home: "A", away: "B" }))).toBe(true);
  });

  it("returns a finite spread when fit is valid", () => {
    const fit: LsFit = {
      teams: ["KC", "BUF"],
      ratings: [2.5, -1.5],
      hfa: 1.5,
    };
    const r = lsSpreadAdapter({ fit, home: "KC", away: "BUF" });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      // 2.5 - (-1.5) + 1.5 = 5.5
      expect(r.value as number).toBeCloseTo(5.5, 3);
    }
  });

  it("fails closed when team not in fit", () => {
    const fit: LsFit = { teams: ["KC"], ratings: [1], hfa: 1 };
    expect(isFailClosed(lsSpreadAdapter({ fit, home: "KC", away: "NE" }))).toBe(true);
  });
});

describe("anchorWeightAdapter", () => {
  it("returns weight in (0,1]", () => {
    // kappa must be modest or exp(-kappa*elapsed) underflows to 0
    const r = anchorWeightAdapter({ secondsLeft: 1800, kappa: 1.2 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThan(0);
      expect(r.value as number).toBeLessThanOrEqual(1);
    }
  });

  it("fails closed on invalid kappa", () => {
    expect(isFailClosed(anchorWeightAdapter({ secondsLeft: 600, kappa: 0 }))).toBe(true);
    expect(isFailClosed(anchorWeightAdapter(null))).toBe(true);
  });
});

describe("fgMakeProbabilityAdapter", () => {
  it("returns make probability", () => {
    const r = fgMakeProbabilityAdapter({ distance: 40, windMph: 5, isOutdoor: true });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThan(0);
      expect(r.value as number).toBeLessThan(1);
    }
  });

  it("fails closed on missing distance — never imputes", () => {
    expect(isFailClosed(fgMakeProbabilityAdapter({ distance: null }))).toBe(true);
    expect(isFailClosed(fgMakeProbabilityAdapter(null))).toBe(true);
  });
});

describe("passerRatingAllowedAdapter", () => {
  it("returns NFL passer rating", () => {
    const r = passerRatingAllowedAdapter({
      attempts: 10,
      completions: 8,
      yards: 120,
      touchdowns: 1,
      interceptions: 0,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeGreaterThan(80);
  });

  it("fails closed on zero attempts", () => {
    expect(
      isFailClosed(
        passerRatingAllowedAdapter({
          attempts: 0,
          completions: 0,
          yards: 0,
          touchdowns: 0,
          interceptions: 0,
        }),
      ),
    ).toBe(true);
  });
});

describe("generalizedPoissonAdapter", () => {
  it("returns PMF value", () => {
    const r = generalizedPoissonAdapter({ k: 2, theta: 0, lambda: 2 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeCloseTo(Math.exp(-2) * 2, 3);
    }
  });

  it("fails closed on invalid k", () => {
    expect(isFailClosed(generalizedPoissonAdapter({ k: -1, theta: 0, lambda: 1 }))).toBe(true);
    expect(isFailClosed(generalizedPoissonAdapter(null))).toBe(true);
  });
});
