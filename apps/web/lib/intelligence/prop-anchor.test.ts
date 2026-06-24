import type { MarketAnchoredPlayerProjection } from "@sports/prediction-engine";
import { describe, expect, it } from "vitest";
import { reconcilePlayerPropsAgainstMarketAnchor, type PlayerPropAnchorLine } from "./prop-anchor";

const player = (
  overrides: Partial<MarketAnchoredPlayerProjection> = {},
): MarketAnchoredPlayerProjection => ({
  playerId: "wr-1",
  teamSide: "home",
  position: "WR",
  allocationWeight: 0.2,
  passingYards: 0,
  rushingYards: 0,
  receivingYards: 80,
  passingTouchdowns: 0,
  rushingTouchdowns: 0,
  receivingTouchdowns: 0.55,
  projectedYards: 80,
  projectedTouchdowns: 0.55,
  fantasyPoints: 11.3,
  divergence: 1.2,
  priced: false,
  status: "shadow",
  ...overrides,
});

const line = (overrides: Partial<PlayerPropAnchorLine> = {}): PlayerPropAnchorLine => ({
  id: "prop-1",
  playerId: "wr-1",
  label: "Avery Knox",
  book: "ThirdMarket",
  market: "Receiving Yards",
  metric: "yards",
  line: 108.5,
  fairValue: 116,
  marketStdev: 12,
  sourceReliability: 0.75,
  team: "GSE",
  position: "WR",
  ...overrides,
});

describe("prop-anchor triangulation", () => {
  it("reconciles player prop residuals against B3 anchored yards without mutating the anchor", () => {
    const anchor = player();
    const out = reconcilePlayerPropsAgainstMarketAnchor([anchor], [line()], {
      generatedAt: "2026-06-24T04:00:00.000Z",
    });
    const residual = out.residuals[0];
    if (!residual) throw new Error("expected residual");

    expect(anchor.projectedYards).toBe(80);
    expect(residual.anchorValue).toBe(80);
    expect(residual.propExpectedValue).toBe(116);
    expect(residual.residual).toBe(36);
    expect(residual.residualZ).toBe(3);
    expect(residual.expectationBasis).toBe("fair-value");
    expect(out.priced).toBe(false);
    expect(out.status).toBe("shadow");
    expect(out.draftOnly).toBe(true);
  });

  it("routes material prop-anchor residuals into the shadow divergence board", () => {
    const out = reconcilePlayerPropsAgainstMarketAnchor([player()], [line()], {
      generatedAt: "2026-06-24T04:00:00.000Z",
    });
    const signal = out.divergenceBoard.bettingCandidates[0];
    if (!signal) throw new Error("expected betting candidate shadow signal");

    expect(signal.source).toBe("prop-anchor");
    expect(signal.routes).toContain("betting-candidate-shadow");
    expect(signal.routes).toContain("fantasy-buy-low");
    expect(signal.priced).toBe(false);
    expect(signal.status).toBe("shadow");
    expect(out.divergenceBoard.draftOnly).toBe(true);
  });

  it("compares touchdowns and derived fantasy points on their own units", () => {
    const out = reconcilePlayerPropsAgainstMarketAnchor(
      [player({ playerId: "rb-1", position: "RB", projectedYards: 92, projectedTouchdowns: 0.8, fantasyPoints: 14 })],
      [
        line({
          id: "td-1",
          playerId: "rb-1",
          label: "Mason Vale",
          market: "Anytime TD",
          metric: "touchdowns",
          line: 0.45,
          fairValue: 1.05,
          marketStdev: 0.25,
          position: "RB",
        }),
        line({
          id: "fp-1",
          playerId: "rb-1",
          label: "Mason Vale",
          market: "Fantasy Points",
          metric: "fantasy-points",
          line: 17.5,
          marketStdev: 3,
          position: "RB",
        }),
      ],
    );

    expect(out.residuals.map((residual) => residual.line.metric)).toEqual([
      "touchdowns",
      "fantasy-points",
    ]);
    expect(out.residuals[0]?.anchorValue).toBe(0.8);
    expect(out.residuals[1]?.anchorValue).toBe(14);
  });

  it("keeps unmatched prop lines out of divergence signals", () => {
    const out = reconcilePlayerPropsAgainstMarketAnchor([player()], [
      line({ id: "missing-1", playerId: "missing-player" }),
    ]);

    expect(out.unmatchedLineIds).toEqual(["missing-1"]);
    expect(out.residuals).toHaveLength(0);
    expect(out.divergenceBoard.signals).toHaveLength(0);
  });
});
