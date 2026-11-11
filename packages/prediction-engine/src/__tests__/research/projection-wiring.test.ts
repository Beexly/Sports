import { describe, it, expect } from "vitest";
import {
  projectPlayerSeason,
  DEFAULT_PROJECTION_PARAMETERS,
  type PlayerSeasonLine,
} from "../../player-projection.js";
import { resolveProjectionWiring, PARAM_NAMES } from "../../research/projection-params.js";
import { loadRegistry } from "../../research/registry.js";
import type { ResearchEvidence } from "../../research/types.js";

const HISTORY: PlayerSeasonLine[] = [
  { season: 2021, games: 16, pprPerGame: 10 },
  { season: 2022, games: 16, pprPerGame: 12 },
  { season: 2023, games: 16, pprPerGame: 18 },
];

function evidenceWith(params: Array<{ name: string; value: number }>): ResearchEvidence[] {
  return loadRegistry([
    {
      arxiv_id: "2101.00001",
      paper_title: "Wired Paper",
      lane: "calibration",
      confidence: 0.99,
      enabled: true,
      parameters: params,
    },
  ]);
}

describe("projectPlayerSeason parameter wiring", () => {
  it("reproduces the shipped default exactly when no parameters are passed", () => {
    const p = projectPlayerSeason(HISTORY, 2024);
    expect(p.projectedPprPerGame).toBeCloseTo(14.06, 1);
    expect(p.parameterSource).toBe("default");
  });

  it("honours an explicit parameter set", () => {
    // regressionGames 0 disables shrinkage, so the projection equals the weighted observed rate
    const p = projectPlayerSeason(HISTORY, 2024, {
      ...DEFAULT_PROJECTION_PARAMETERS,
      regressionGames: 0,
      source: "test",
    });
    expect(p.projectedPprPerGame).toBeCloseTo(15.4, 1);
    expect(p.parameterSource).toBe("test");
  });

  it("returns the configured prior when there is no history", () => {
    const p = projectPlayerSeason([], 2024, {
      recencyWeights: [0.6, 0.3, 0.1],
      regressionGames: 8,
      leaguePriorPpr: 9.5,
      source: "test",
    });
    expect(p.projectedPprPerGame).toBe(9.5);
  });

  it("rejects a negative regressionGames rather than producing nonsense", () => {
    expect(() =>
      projectPlayerSeason(HISTORY, 2024, {
        recencyWeights: [0.6, 0.3, 0.1],
        regressionGames: -1,
        leaguePriorPpr: 6,
      }),
    ).toThrow(RangeError);
  });

  it("falls back to the prior when every recency weight is zero", () => {
    const p = projectPlayerSeason(HISTORY, 2024, {
      recencyWeights: [0, 0, 0],
      regressionGames: 8,
      leaguePriorPpr: 6,
    });
    expect(p.projectedPprPerGame).toBe(6);
    expect(p.method).toContain("degenerate");
  });
});

describe("resolveProjectionWiring", () => {
  it("leaves every slot at its default when the corpus is empty", () => {
    const r = resolveProjectionWiring([]);
    expect(r.moved).toBe(false);
    expect(r.parameters.regressionGames).toBe(DEFAULT_PROJECTION_PARAMETERS.regressionGames);
    expect(r.parameters.leaguePriorPpr).toBe(DEFAULT_PROJECTION_PARAMETERS.leaguePriorPpr);
    expect(r.parameters.source).toBe("default");
  });

  it("moves a slot when a paper states it and strength is 1", () => {
    const r = resolveProjectionWiring(
      evidenceWith([{ name: PARAM_NAMES.regressionGames, value: 0 }]),
      1,
    );
    expect(r.moved).toBe(true);
    expect(r.parameters.regressionGames).toBe(0);
    expect(r.contributors.regressionGames).toBe(1);
  });

  it("does not move anything at strength 0 even with evidence present", () => {
    const r = resolveProjectionWiring(
      evidenceWith([{ name: PARAM_NAMES.regressionGames, value: 0 }]),
      0,
    );
    expect(r.parameters.regressionGames).toBe(DEFAULT_PROJECTION_PARAMETERS.regressionGames);
  });

  it("carries evidence through into a real projection", () => {
    const wired = resolveProjectionWiring(
      evidenceWith([{ name: PARAM_NAMES.regressionGames, value: 0 }]),
      1,
    );
    const p = projectPlayerSeason(HISTORY, 2024, wired.parameters);
    expect(p.projectedPprPerGame).toBeCloseTo(15.4, 1);
    expect(p.parameterSource).toContain("research");
  });

  it("ignores a paper that is explicitly disabled", () => {
    const evidence = loadRegistry([
      {
        arxiv_id: "2101.00002",
        paper_title: "Disabled Paper",
        lane: "calibration",
        confidence: 0.99,
        enabled: false,
        parameters: [{ name: PARAM_NAMES.regressionGames, value: 0 }],
      },
    ]);
    const r = resolveProjectionWiring(evidence, 1);
    expect(r.moved).toBe(false);
    expect(r.parameters.regressionGames).toBe(DEFAULT_PROJECTION_PARAMETERS.regressionGames);
  });

  it("ignores a paper whose title match is below the confidence floor", () => {
    const evidence = loadRegistry([
      {
        arxiv_id: "2101.00003",
        paper_title: "Weak Match",
        lane: "calibration",
        confidence: 0.4,
        enabled: true,
        parameters: [{ name: PARAM_NAMES.regressionGames, value: 0 }],
      },
    ]);
    expect(resolveProjectionWiring(evidence, 1).moved).toBe(false);
  });
});
