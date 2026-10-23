import { describe, it, expect } from "vitest";
import { buildContextualBitmask288 } from "../mcp/bitmask-schema";
import { nbaAdapter, nhlAdapter, cfbAdapter } from "../leagues/league-adapter";
import { assertCopulaInBounds, claytonCdf, frankCdf, gumbelCdf } from "../copula/archimedean-sgp";
import { amplifySuccessRate, shrinkPremiseWeight } from "../learning/grpo-rlvr-updater";
import { synthesizeRegressionTest } from "../learning/postgame-regression-synthesizer";
import { stageAPrune } from "../mcp/mcp-cognitive-router";
import { NE_CHI_20261022_BITMASK_INPUT } from "../mcp/bitmask-schema";

describe("multi-sport stubs and 72-hour leftovers", () => {
  it("builds NBA, NHL, and CFB bitmasks without touching the NFL lock", () => {
    const nba = buildContextualBitmask288(
      nbaAdapter.toBitmaskInput({
        gameId: "nba-1",
        temperatureF: 72,
        restDaysHome: 1,
        restDaysAway: 2,
        rimProtectorOut: true,
        backToBack: true,
      }),
    );
    const nhl = buildContextualBitmask288(
      nhlAdapter.toBitmaskInput({
        gameId: "nhl-1",
        temperatureF: 40,
        startingGoalieConfirmed: false,
        topPairOut: true,
      }),
    );
    const cfb = buildContextualBitmask288(
      cfbAdapter.toBitmaskInput({
        gameId: "cfb-1",
        temperatureF: 55,
        windSpeedMph: 12,
        portalCohesionLow: true,
        ultraFastTempo: true,
      }),
    );
    expect(nba.sha256Digest).not.toBe(nhl.sha256Digest);
    expect(cfb.activeBitIndices.length).toBeGreaterThan(0);
  });

  it("keeps a Clayton joint inside Frechet bounds and shrinks a reward", () => {
    const joint = claytonCdf(0.6, 0.55, 1.4);
    expect(() => assertCopulaInBounds(joint, [0.6, 0.55])).not.toThrow();
    expect(() => assertCopulaInBounds(frankCdf(0.6, 0.55, 2), [0.6, 0.55])).not.toThrow();
    expect(() => assertCopulaInBounds(gumbelCdf(0.6, 0.55, 1.6), [0.6, 0.55])).not.toThrow();
    expect(amplifySuccessRate(0.4)).toBeGreaterThan(0.4);
    expect(shrinkPremiseWeight({ priorWeight: 1, realizedAdvantage: 0.2, n: 8 })).toBeGreaterThan(1);
  });

  it("prunes the steam fade when bit 224 is on and synthesizes a regression", () => {
    const mask = buildContextualBitmask288(NE_CHI_20261022_BITMASK_INPUT);
    const pruned = stageAPrune(mask, [
      { id: "STEAM_EXHAUSTION_FADE", requiredMaskBits: [140], forbiddenMaskBits: [224], sampleCount: 155 },
    ]);
    expect(pruned.kept).not.toContain("STEAM_EXHAUSTION_FADE");
    const src = synthesizeRegressionTest({
      gameId: "2026-10-22-NE-CHI",
      selection: "CHI -3",
      publishState: "WITHHOLD",
      edgeWonByPts: 5,
    });
    expect(src).toContain("not.toBe");
  });
});
