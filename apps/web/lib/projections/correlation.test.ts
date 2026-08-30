import { describe, expect, it } from "vitest";
import {
  buildFantasyCopulaLinks,
  buildGaussianCopulaMatrix,
  buildParlayCopulaLinks,
  summarizeGaussianCopulaPortfolio,
  type GaussianCopulaMarginal,
} from "./correlation";

describe("projection Gaussian copula correlation", () => {
  const marginals: GaussianCopulaMarginal[] = [
    { id: "qb", label: "QB", role: "QB", team: "CIN", mean: 21, stdev: 5 },
    { id: "wr", label: "WR", role: "WR", team: "CIN", mean: 15, stdev: 6 },
    { id: "rb", label: "RB", role: "RB", team: "ATL", mean: 14, stdev: 4 },
  ];

  it("links QB to same-team pass-catchers and keeps matrix symmetric", () => {
    const links = buildFantasyCopulaLinks(marginals);
    const matrix = buildGaussianCopulaMatrix(marginals, links);

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ sourceId: "qb", targetId: "wr", rho: 0.35, kind: "qb-catcher" });
    expect(matrix[0]?.[1]).toBe(0.35);
    expect(matrix[1]?.[0]).toBe(0.35);
    expect(matrix[0]?.[2]).toBe(0);
  });

  it("summarizes a shadow/priced=false correlated portfolio", () => {
    const summary = summarizeGaussianCopulaPortfolio(
      marginals,
      buildFantasyCopulaLinks(marginals),
      60
    );

    expect(summary.status).toBe("shadow");
    expect(summary.priced).toBe(false);
    expect(summary.correlatedStdDev).toBeGreaterThan(summary.independentStdDev);
    expect(summary.varianceLift).toBeGreaterThan(0);
    expect(summary.spikeProbability).toBeGreaterThan(0);
  });

  it("links same-game parlay legs through game-stack correlation", () => {
    const legs: GaussianCopulaMarginal[] = [
      { id: "spread", label: "Spread", role: "LEG", groupId: "game-1", mean: 0.55, stdev: 0.5 },
      { id: "total", label: "Total", role: "LEG", groupId: "game-1", mean: 0.5, stdev: 0.5 },
      { id: "prop", label: "Prop", role: "LEG", groupId: "game-2", mean: 0.48, stdev: 0.5 },
    ];

    const links = buildParlayCopulaLinks(legs);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ sourceId: "spread", targetId: "total", kind: "game-stack" });
  });
});
