import { describe, expect, it } from "vitest";

import {
  KICKOFF_RETURN_YARDS_BIND_METHOD_TAG,
  DEFAULT_KICKOFF_SCRIPT_ELASTICITY,
  bindKickoffReturnYardsSamples,
  boundKickoffReturnYardsSamples,
  winProbForKickoff,
  scriptAdjustedPosterior,
  scriptProbOverKickoffReturnYards,
  type GameScriptRow,
  type GameScriptCell,
  type KickoffReturnYardsBindRequest,
  type KickoffReturnYardsBindResult,
  type BoundKickoffReturnSample,
} from "../kickoff-return-yards-bind.js";
import {
  KICKOFF_RETURN_YARDS_METHOD_TAG,
  KickoffReturnSample,
  fitKickoffReturnYardsPrior,
  fitKickoffReturnAttemptsPrior,
  posteriorKickoffReturnYards,
  posteriorKickoffReturnAttempts,
  probOverKickoffReturnYards,
} from "../kickoff-return-yards.js";
import { posteriorRate } from "../props-hb.js";

function gRow(o: Partial<GameScriptRow>): GameScriptRow {
  return {
    season: 2024,
    week: 3,
    team: "KC",
    preGameWinProb: 0.58,
    spread: -4.0,
    total: 47.5,
    ...o,
  };
}

function req(o: Partial<KickoffReturnYardsBindRequest>): KickoffReturnYardsBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    team: "KC",
    returns: { attempts: 8, yards: 210 },
    ...o,
  };
}

function isDenied(r: KickoffReturnYardsBindResult): r is Extract<KickoffReturnYardsBindResult, { ok: false }> {
  return !r.ok;
}

const SAMPLES: KickoffReturnSample[] = [
  { attempts: 12, yards: 312 },
  { attempts: 8, yards: 168 },
  { attempts: 15, yards: 450 },
  { attempts: 4, yards: 56 },
  { attempts: 10, yards: 280 },
  { attempts: 6, yards: 90 },
  { attempts: 18, yards: 468 },
  { attempts: 3, yards: 90 },
];

const ATTEMPTS_SAMPLES = [
  { games: 5, returns: 50 },
  { games: 8, returns: 40 },
  { games: 10, returns: 80 },
  { games: 3, returns: 12 },
  { games: 7, returns: 70 },
];

describe("kickoff game-script bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(KICKOFF_RETURN_YARDS_BIND_METHOD_TAG).toBe("kickoff_return_yards_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [gRow({})];
    const results = bindKickoffReturnYardsSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("default script elasticity is 0.2", () => {
    expect(DEFAULT_KICKOFF_SCRIPT_ELASTICITY).toBe(0.2);
  });
});

describe("winProbForKickoff", () => {
  it("returns the cell for the matching team/season/week", () => {
    const rows = [gRow({ team: "KC", season: 2024, week: 3, preGameWinProb: 0.72 })];
    const cell = winProbForKickoff(rows, "KC", 2024, 3);
    expect(cell).not.toBeNull();
    expect(cell!.value).toBe(0.72);
    expect(cell!.grain).toBe("pregame_for_kickoff");
    expect(cell!.provenance).toBe("market_implied");
  });

  it("does NOT match a different team", () => {
    const rows = [gRow({ team: "KC", preGameWinProb: 0.72 })];
    expect(winProbForKickoff(rows, "BUF", 2024, 3)).toBeNull();
  });

  it("does NOT match a different week (same-week is the target, not prior)", () => {
    const rows = [gRow({ week: 2, preGameWinProb: 0.72 })];
    // No row for week 3 → fail-closed
    expect(winProbForKickoff(rows, "KC", 2024, 3)).toBeNull();
  });

  it("FAILS CLOSED: null preGameWinProb → null", () => {
    const rows = [gRow({ preGameWinProb: null })];
    expect(winProbForKickoff(rows, "KC", 2024, 3)).toBeNull();
  });

  it("FAILS CLOSED: non-finite preGameWinProb → null", () => {
    const rows = [gRow({ preGameWinProb: NaN })];
    expect(winProbForKickoff(rows, "KC", 2024, 3)).toBeNull();
  });

  it("FAILS CLOSED: out-of-range [1.2] → null", () => {
    const rows = [gRow({ preGameWinProb: 1.2 })];
    expect(winProbForKickoff(rows, "KC", 2024, 3)).toBeNull();
  });

  it("FAILS CLOSED: no rows at all → null", () => {
    expect(winProbForKickoff([], "KC", 2024, 3)).toBeNull();
  });
});

describe("bindKickoffReturnYardsSamples", () => {
  it("binds win probability and passes through realized inputs unchanged", () => {
    const rows = [gRow({ preGameWinProb: 0.72 })];
    const results = bindKickoffReturnYardsSamples(rows, [req({ returns: { attempts: 18, yards: 468 } })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(18);
    expect(results[0]!.sample.yards).toBe(468);
    expect(results[0]!.sample.preGameWinProb.value).toBe(0.72);
    expect(results[0]!.sample.preGameWinProb.grain).toBe("pregame_for_kickoff");
    expect(results[0]!.sample.preGameWinProb.provenance).toBe("market_implied");
  });

  it("FAILS CLOSED: no game-script row → dropped, never 0.5", () => {
    const rows: GameScriptRow[] = [];
    const results = bindKickoffReturnYardsSamples(rows, [req({})]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_game_script_row");
    // boundRushYardsSamples equivalent: only ok samples returned
    expect(boundKickoffReturnYardsSamples(rows, [req({})])).toEqual([]);
  });

  it("FAILS CLOSED: out-of-range win prob → dropped", () => {
    const rows = [gRow({ preGameWinProb: 1.5 })];
    const results = bindKickoffReturnYardsSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_game_script_row");
  });

  it("batch: one bad request drops, good requests bind", () => {
    const rows = [
      gRow({ team: "KC", season: 2024, week: 3, preGameWinProb: 0.72 }),
      gRow({ team: "BUF", season: 2024, week: 3, preGameWinProb: 0.35 }),
    ];
    const results = bindKickoffReturnYardsSamples(rows, [
      req({ team: "KC", returns: { attempts: 8, yards: 210 } }),
      req({ team: "ARI", returns: { attempts: 6, yards: 150 } }), // no game-script row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.preGameWinProb.value).toBe(0.72);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_game_script_row");
  });

  it("boundKickoffReturnYardsSamples returns only ok samples", () => {
    const rows = [gRow({ preGameWinProb: 0.60 })];
    const results = bindKickoffReturnYardsSamples(rows, [
      req({}),
      req({ team: "BUF" }), // no row
    ]);
    const only = results.filter((r): r is Extract<KickoffReturnYardsBindResult, { ok: true }> => r.ok);
    expect(only).toHaveLength(1);
    expect(boundKickoffReturnYardsSamples(rows, [req({}), req({ team: "BUF" })])).toHaveLength(1);
  });
});

describe("scriptAdjustedPosterior", () => {
  it("is identity when elasticity=0", () => {
    const prior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const post = posteriorKickoffReturnYards(prior, SAMPLES[0]!);
    const cell: GameScriptCell = { value: 0.58, grain: "pregame_for_kickoff", provenance: "market_implied" };
    const adj = scriptAdjustedPosterior(post, cell, 0);
    expect(adj.alpha).toBe(post.alpha);
    expect(adj.beta).toBe(post.beta);
    expect(adj.mean).toBe(post.mean);
  });

  it("reduces the rate when team is heavily favored (high WP)", () => {
    const prior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const post = posteriorKickoffReturnYards(prior, SAMPLES[0]!);
    const cell: GameScriptCell = { value: 0.85, grain: "pregame_for_kickoff", provenance: "market_implied" };
    const adj = scriptAdjustedPosterior(post, cell, DEFAULT_KICKOFF_SCRIPT_ELASTICITY);
    // WP 0.85 → multiplier = 1 - 0.2*(0.85-0.5) = 1 - 0.07 = 0.93 → rate ↓
    expect(adj.mean).toBeLessThan(post.mean);
    expect(adj.beta).toBe(post.beta); // beta held constant
  });

  it("increases the rate when team is a heavy underdog (low WP)", () => {
    const prior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const post = posteriorKickoffReturnYards(prior, SAMPLES[0]!);
    const cell: GameScriptCell = { value: 0.15, grain: "pregame_for_kickoff", provenance: "market_implied" };
    const adj = scriptAdjustedPosterior(post, cell, DEFAULT_KICKOFF_SCRIPT_ELASTICITY);
    // WP 0.15 → multiplier = 1 - 0.2*(0.15-0.5) = 1 + 0.07 = 1.07 → rate ↑
    expect(adj.mean).toBeGreaterThan(post.mean);
  });

  it("is neutral at WP=0.5 (even game)", () => {
    const prior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const post = posteriorKickoffReturnYards(prior, SAMPLES[0]!);
    const cell: GameScriptCell = { value: 0.5, grain: "pregame_for_kickoff", provenance: "market_implied" };
    const adj = scriptAdjustedPosterior(post, cell);
    expect(adj.mean).toBeCloseTo(post.mean, 10);
  });

  it("clamps the multiplier to [0.25, 4.0]", () => {
    const prior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const post = posteriorKickoffReturnYards(prior, SAMPLES[0]!);
    // Extreme: WP=1.0, elasticity=10 → multiplier = 1 - 10*0.5 = -4 → clamped to 0.25
    const cell: GameScriptCell = { value: 1.0, grain: "pregame_for_kickoff", provenance: "market_implied" };
    const adj = scriptAdjustedPosterior(post, cell, 10);
    const expectedMin = post.alpha * 0.25;
    expect(adj.alpha).toBeCloseTo(expectedMin, 10);
  });

  it("throws on non-positive posterior", () => {
    const bad = { alpha: 0, beta: 1, mean: 0 };
    const cell: GameScriptCell = { value: 0.6, grain: "pregame_for_kickoff", provenance: "market_implied" };
    expect(() => scriptAdjustedPosterior(bad, cell)).toThrow(RangeError);
  });

  it("throws on negative elasticity", () => {
    const prior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const post = posteriorKickoffReturnYards(prior, SAMPLES[0]!);
    const cell: GameScriptCell = { value: 0.6, grain: "pregame_for_kickoff", provenance: "market_implied" };
    expect(() => scriptAdjustedPosterior(post, cell, -0.1)).toThrow(RangeError);
  });
});

describe("scriptProbOverKickoffReturnYards — full pipeline", () => {
  it("equals the unadjusted probability when elasticity=0", () => {
    const yardPrior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const attPrior = fitKickoffReturnAttemptsPrior(ATTEMPTS_SAMPLES)!;
    const yardPost = posteriorKickoffReturnYards(yardPrior, SAMPLES[0]!);
    const retPost = posteriorKickoffReturnAttempts(attPrior, ATTEMPTS_SAMPLES[1]!);

    const cell: GameScriptCell = { value: 0.85, grain: "pregame_for_kickoff", provenance: "market_implied" };

    const adjusted = scriptProbOverKickoffReturnYards(yardPost, retPost, cell, 49.5, 0);
    const baseline = probOverKickoffReturnYards(yardPost, retPost, 49.5);
    expect(adjusted).toBeCloseTo(baseline, 10);
  });

  it("shifts probability under game-script pressure", () => {
    const yardPrior = fitKickoffReturnYardsPrior(SAMPLES)!;
    const attPrior = fitKickoffReturnAttemptsPrior(ATTEMPTS_SAMPLES)!;
    const yardPost = posteriorKickoffReturnYards(yardPrior, SAMPLES[0]!);
    const retPost = posteriorKickoffReturnAttempts(attPrior, ATTEMPTS_SAMPLES[1]!);

    const favored: GameScriptCell = { value: 0.85, grain: "pregame_for_kickoff", provenance: "market_implied" };
    const underdog: GameScriptCell = { value: 0.15, grain: "pregame_for_kickoff", provenance: "market_implied" };

    const pFavored = scriptProbOverKickoffReturnYards(yardPost, retPost, favored, 49.5);
    const pUnderdog = scriptProbOverKickoffReturnYards(yardPost, retPost, underdog, 49.5);

    // Favored → reduced rate → lower P(yards > 49.5)
    // Underdog → increased rate → higher P(yards > 49.5)
    expect(pUnderdog).toBeGreaterThan(pFavored);
  });
});
