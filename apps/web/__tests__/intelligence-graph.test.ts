import { describe, expect, it } from "vitest";
import {
  buildGameIntelligenceNode,
  buildMarketPulse,
  buildSlateWeather,
  computeEvidenceHealth,
  projectForLens,
} from "@/lib/intelligence-graph";
import { fixtureGame, fixturePick, fixtureSignals } from "@/__fixtures__/intelligence-graph/game-node";

describe("Intelligence Graph v0", () => {
  it("computes evidence health from source trust, freshness, and bootstrap provenance", () => {
    const health = computeEvidenceHealth(fixtureSignals, new Date("2026-05-22T18:30:00.000Z"));

    expect(health.sourceCount).toBe(3);
    expect(health.staleCount).toBe(1);
    expect(health.bootstrapCount).toBe(1);
    expect(health.score).toBeGreaterThan(60);
    expect(health.status).toBe("WATCH");
  });

  it("builds market pulse without counting bootstrap picks as published canonical picks", () => {
    const pulse = buildMarketPulse(fixtureGame, [
      fixturePick,
      { ...fixturePick, id: "bootstrap-pick", isBootstrap: true },
    ]);

    expect(pulse.edgeIndex).toBe(71);
    expect(pulse.bookmakerCoverage).toBe(11);
    expect(pulse.publishedPickCount).toBe(1);
    expect(pulse.gatedByBootstrap).toBe(true);
  });

  it("builds a game node and slate weather aggregate", () => {
    const node = buildGameIntelligenceNode({
      game: fixtureGame,
      picks: [fixturePick],
      signals: fixtureSignals,
      now: new Date("2026-05-22T18:30:00.000Z"),
    });
    const slate = buildSlateWeather([node]);

    expect(node.matchup).toBe("Milwaukee Bucks @ Boston Celtics");
    expect(node.marketPulse.publishedPickCount).toBe(1);
    expect(slate).toEqual([
      {
        sport: "NBA",
        gameCount: 1,
        averageEvidenceScore: node.evidenceHealth.score,
        bootstrapGameCount: 0,
      },
    ]);
  });

  it("projects lens-safe monetization surfaces without hiding public Edge Index", () => {
    const node = buildGameIntelligenceNode({ game: fixtureGame, picks: [fixturePick], signals: fixtureSignals });

    expect(projectForLens(node, "FAN").canShowEdgeIndex).toBe(true);
    expect(projectForLens(node, "FAN").canShowConfidence).toBe(false);
    expect(projectForLens(node, "BETTOR").canShowConfidence).toBe(true);
    expect(projectForLens(node, "ANALYST").canShowFactorBreakdown).toBe(true);
  });
});
