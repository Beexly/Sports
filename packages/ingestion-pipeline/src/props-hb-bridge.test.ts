import { describe, expect, it } from "vitest";
import {
  buildModelProbOver,
  estimatePropOver,
  estimateRushYardsOver,
  estimatePassYardsOver,
  estimateReceptionsOver,
  estimateRecTdProb,
  estimateCompletionsOver,
  estimateIntOver,
  estimatePassTdOver,
  estimateRushAttemptsOver,
  estimateRushTdOver,
  estimateSacksOver,
  estimateAnytimeTdProb,
  evalBindRushYards,
  evalBindSep,
  evalBindYac,
  evalBindCatchCushion,
  evalBindCompAirYardsDiff,
  evalBindCpoeComp,
  evalBindInt,
  evalBindRecTdCushion,
  evalBindSackTtt,
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

const compSamples = [
  { attempts: 30, completions: 12 },
  { attempts: 35, completions: 28 },
  { attempts: 28, completions: 10 },
  { attempts: 40, completions: 32 },
];
const intSamples = [
  { attempts: 30, ints: 0 },
  { attempts: 35, ints: 4 },
  { attempts: 28, ints: 0 },
  { attempts: 32, ints: 5 },
];
const passTdSamples = [
  { attempts: 30, passTds: 0 },
  { attempts: 35, passTds: 5 },
  { attempts: 28, passTds: 1 },
  { attempts: 32, passTds: 4 },
];
const rushAttSamples = [
  { games: 8, attempts: 20 },
  { games: 8, attempts: 180 },
  { games: 8, attempts: 40 },
  { games: 8, attempts: 160 },
];
const rushTdSamples = [
  { attempts: 20, rushTds: 0 },
  { attempts: 180, rushTds: 12 },
  { attempts: 40, rushTds: 1 },
  { attempts: 160, rushTds: 10 },
];
const sackSamples = [
  { dropbacks: 35, sacks: 0 },
  { dropbacks: 40, sacks: 8 },
  { dropbacks: 32, sacks: 1 },
  { dropbacks: 38, sacks: 7 },
];
const atdSamples = [
  { touches: 18, tds: 0 },
  { touches: 22, tds: 4 },
  { touches: 20, tds: 1 },
  { touches: 24, tds: 5 },
];

describe("props-hb-bridge remaining per-stat models", () => {
  it("estimateCompletionsOver returns P(over) in (0,1)", () => {
    const r = estimateCompletionsOver({
      samples: compSamples,
      playerAttempts: 100,
      playerCompletions: 55,
      line: 22.5,
      attemptsNextGame: 32,
    });
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("estimateIntOver supports only line 0.5 and fail-closes otherwise", () => {
    const ok = estimateIntOver({
      samples: intSamples,
      playerAttempts: 125,
      playerInts: 2,
      attemptsNextGame: 32,
    });
    expect(ok.ok, ok.ok ? "" : `reason=${ok.reason}`).toBe(true);
    const bad = estimateIntOver({
      samples: intSamples,
      playerAttempts: 125,
      playerInts: 2,
      attemptsNextGame: 32,
      line: 1.5,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain("not imputed");
  });

  it("estimatePassTdOver returns P(over 0.5) in (0,1)", () => {
    const r = estimatePassTdOver({
      samples: passTdSamples,
      playerAttempts: 100,
      playerPassTds: 3,
      attemptsNextGame: 32,
    });
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("estimateRushAttemptsOver returns P(over) in (0,1)", () => {
    const r = estimateRushAttemptsOver({
      samples: rushAttSamples,
      playerAttempts: 360,
      playerGames: 24,
      line: 16.5,
    });
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.pOver).toBeGreaterThan(0);
      expect(r.pOver).toBeLessThan(1);
    }
  });

  it("estimateRushTdOver and estimateSacksOver and estimateAnytimeTdProb compute", () => {
    const td = estimateRushTdOver({
      samples: rushTdSamples,
      playerAttempts: 360,
      playerRushTds: 12,
      attemptsNextGame: 18,
    });
    expect(td.ok, td.ok ? "" : `reason=${td.reason}`).toBe(true);
    const sacks = estimateSacksOver({
      samples: sackSamples,
      playerDropbacks: 107,
      playerSacks: 3,
      line: 1.5,
      dropbacksNextGame: 34,
    });
    expect(sacks.ok, sacks.ok ? "" : `reason=${sacks.reason}`).toBe(true);
    const atd = estimateAnytimeTdProb({
      samples: atdSamples,
      playerTouches: 60,
      playerTds: 3,
      touchesNextGame: 18,
    });
    expect(atd.ok, atd.ok ? "" : `reason=${atd.reason}`).toBe(true);
    if (atd.ok) {
      expect(atd.pOver).toBeGreaterThan(0);
      expect(atd.pOver).toBeLessThan(1);
    }
  });

  it("remaining estimates fail-close on empty samples", () => {
    expect(estimateCompletionsOver({ samples: [], playerAttempts: 1, playerCompletions: 1, line: 1, attemptsNextGame: 1 }).ok).toBe(false);
    expect(estimateIntOver({ samples: [], playerAttempts: 1, playerInts: 0, attemptsNextGame: 1 }).ok).toBe(false);
    expect(estimatePassTdOver({ samples: [], playerAttempts: 1, playerPassTds: 0, attemptsNextGame: 1 }).ok).toBe(false);
    expect(estimateRushAttemptsOver({ samples: [], playerAttempts: 1, playerGames: 1, line: 1 }).ok).toBe(false);
    expect(estimateRushTdOver({ samples: [], playerAttempts: 1, playerRushTds: 0, attemptsNextGame: 1 }).ok).toBe(false);
    expect(estimateSacksOver({ samples: [], playerDropbacks: 1, playerSacks: 0, line: 1, dropbacksNextGame: 1 }).ok).toBe(false);
    expect(estimateAnytimeTdProb({ samples: [], playerTouches: 1, playerTds: 0, touchesNextGame: 1 }).ok).toBe(false);
  });
});

describe("props-hb-bridge bind-layer wrappers", () => {
  it("evalBind* fail-close on non-array input", () => {
    const r = evalBindRushYards(null as never, null as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("arrays");
    expect(evalBindSep(null as never, []).ok).toBe(false);
    expect(evalBindYac([], null as never).ok).toBe(false);
    expect(evalBindCatchCushion(null as never, []).ok).toBe(false);
    expect(evalBindCompAirYardsDiff([], null as never).ok).toBe(false);
    expect(evalBindCpoeComp(null as never, []).ok).toBe(false);
    expect(evalBindInt([], null as never).ok).toBe(false);
    expect(evalBindRecTdCushion(null as never, []).ok).toBe(false);
    expect(evalBindSackTtt([], null as never).ok).toBe(false);
  });

  it("evalBind* return empty bound + empty dropped on empty rows", () => {
    const r = evalBindRushYards([], []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bound).toEqual([]);
      expect(r.dropped).toEqual([]);
    }
  });
});
