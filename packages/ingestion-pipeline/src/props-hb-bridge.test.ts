import { describe, expect, it } from "vitest";
import {
  buildModelProbOver,
  estimatePropOver,
  estimateRushYardsOver,
  estimatePassYardsOver,
  estimateReceptionsOver,
  estimateRecTdProb,
} from "./props-hb-bridge.js";

const samples = [
  { games: 10, total: 20 },
  { games: 10, total: 80 },
  { games: 10, total: 50 },
  { games: 12, total: 90 },
  { games: 8, total: 15 },
];

describe("props-hb-bridge", () => {
  it("estimates P(over) from rate samples", () => {
    const r = estimatePropOver({
      playerId: "p1",
      propType: "receptions",
      samples,
      line: 5.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.pOver).toBeGreaterThan(0);
      expect(r.data.pOver).toBeLessThan(1);
      expect(r.data.pOver + r.data.pUnder).toBeCloseTo(1, 5);
      expect(r.data.prior.alpha).toBeGreaterThan(0);
      expect(r.data.posterior.alpha).toBeGreaterThan(0);
    }
  });

  it("fail-closes on empty samples", () => {
    const r = estimatePropOver({
      playerId: "p1",
      propType: "receptions",
      samples: [],
      line: 5.5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no rate samples");
  });

  it("fail-closes on invalid line", () => {
    const r = estimatePropOver({
      playerId: "p1",
      propType: "receptions",
      samples,
      line: Number.NaN,
    });
    expect(r.ok).toBe(false);
  });

  it("buildModelProbOver keys by playerId:propType and records failures", () => {
    const { modelProbOver, failures } = buildModelProbOver([
      { playerId: "p1", propType: "receptions", samples, line: 5.5 },
      { playerId: "p2", propType: "yards", samples: [], line: 45.5 },
    ]);
    expect(Object.keys(modelProbOver)).toEqual(["p1:receptions"]);
    expect(modelProbOver["p1:receptions"]).toBeGreaterThan(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.key).toBe("p2:yards");
  });
});

describe("props-hb-bridge per-stat models", () => {
  const rushSamples = [
    { games: 10, attempts: 180, yards: 820 },
    { games: 10, attempts: 160, yards: 700 },
    { games: 12, attempts: 200, yards: 980 },
    { games: 8, attempts: 120, yards: 520 },
  ];
  const passSamples = [
    { games: 10, attempts: 320, yards: 2800 },
    { games: 10, attempts: 300, yards: 2500 },
    { games: 12, attempts: 380, yards: 3400 },
    { games: 8, attempts: 240, yards: 1900 },
  ];
  const catchSamples = [
    { receptions: 70, targets: 100 },
    { receptions: 60, targets: 95 },
    { receptions: 80, targets: 110 },
    { receptions: 55, targets: 90 },
  ];
  const recTdSamples = [
    { recTds: 2, targets: 100 },
    { recTds: 12, targets: 95 },
    { recTds: 6, targets: 110 },
    { recTds: 1, targets: 90 },
    { recTds: 15, targets: 120 },
    { recTds: 4, targets: 80 },
  ];

  it("estimateRushYardsOver returns P(over) in (0,1)", () => {
    const r = estimateRushYardsOver({
      samples: rushSamples,
      playerAttempts: 170,
      playerYards: 780,
      playerGames: 10,
      line: 75.5,
      attemptsNextGame: 18,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("estimatePassYardsOver returns P(over) in (0,1)", () => {
    const r = estimatePassYardsOver({
      samples: passSamples,
      playerAttempts: 310,
      playerYards: 2700,
      playerGames: 10,
      line: 265.5,
      attemptsNextGame: 32,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("estimateReceptionsOver returns P(over) in (0,1)", () => {
    const r = estimateReceptionsOver({
      samples: catchSamples,
      playerReceptions: 65,
      playerTargets: 100,
      line: 5.5,
      targetsNextGame: 9,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("estimateRecTdProb returns P(TD) in (0,1)", () => {
    const r = estimateRecTdProb({
      samples: recTdSamples,
      playerRecTds: 5,
      playerTargets: 100,
      targetsNextGame: 8,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("fail-closes on empty samples", () => {
    expect(estimateRushYardsOver({ samples: [], playerAttempts: 1, playerYards: 1, playerGames: 1, line: 1, attemptsNextGame: 1 }).ok).toBe(false);
    expect(estimateReceptionsOver({ samples: [], playerReceptions: 1, playerTargets: 1, line: 1, targetsNextGame: 1 }).ok).toBe(false);
  });
});
