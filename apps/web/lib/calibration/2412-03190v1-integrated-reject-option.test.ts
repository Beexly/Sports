import { describe, expect, it } from "vitest";

import {
  ENABLED,
  adaptiveCoverageTarget,
  costBasedSelect,
  coverageOnTarget,
  predictedOpportunities,
  selectPicks,
  variantAgreement,
} from "@/lib/calibration/2412-03190v1-integrated-reject-option";

describe("integrated reject option", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("soft slates get more picks than sharp slates", () => {
    const soft = predictedOpportunities({ nGames: 16, meanAbsEdge: 0.06, sharpness: 0.1 });
    const sharp = predictedOpportunities({ nGames: 16, meanAbsEdge: 0.02, sharpness: 0.9 });
    expect(soft).toBeGreaterThan(sharp);
    expect(adaptiveCoverageTarget({ nGames: 16, meanAbsEdge: 0.06, sharpness: 0.1 }, 16))
      .toBeCloseTo(soft / 16, 10);
  });

  it("selectPicks posts exactly the coverage target by score order", () => {
    const picks = Array.from({ length: 20 }, (_, i) => ({
      id: "p" + i,
      market: "spread" as const,
      score: 20 - i,
    }));
    const sel = selectPicks(picks, 0.3);
    expect(sel.length).toBe(6);
    expect(sel[0].id).toBe("p0");
    expect(coverageOnTarget(sel.length / picks.length, 0.3)).toBe(true);
  });

  it("cost-based and coverage-based variants agree (gate >= 75%)", () => {
    const picks = Array.from({ length: 20 }, (_, i) => ({
      id: "p" + i,
      market: (i % 3 === 0 ? "total" : i % 3 === 1 ? "moneyline" : "spread") as "spread" | "total" | "moneyline",
      score: 20 - i,
    }));
    const cov = selectPicks(picks, 0.5);
    const cost = costBasedSelect(picks, 9.5, (p) => 20 - p.score); // cost = rank
    const agreement = variantAgreement(picks, cov, cost);
    expect(agreement).toBeGreaterThanOrEqual(0.75);
  });
});
