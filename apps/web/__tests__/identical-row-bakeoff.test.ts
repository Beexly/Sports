import { describe, expect, it } from "vitest";
import {
  buildScoreBakeoffIdenticalRows,
  IDENTICAL_ROW_BOOTSTRAP_SEED,
  identicalRowProbability,
  scoreIdenticalRows,
  selectIdenticalRows,
  VERIFY_SCORES_COMMAND,
  type IdenticalRowInput,
  type PickForIdenticalRows,
} from "@/lib/calibration/identical-row-bakeoff";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { toProvenPathPickRow } from "@/lib/calibration/proven-path-rows";

/**
 * Ledger C-265: every score on ONE identical settled-moneyline row set.
 * Fixtures are small enough that every expected number below was worked by
 * hand (the arithmetic is in the comments), so the assertions are the answer
 * and the evidence in one step.
 */

function row(
  pConfidence: number,
  pIndependent: number,
  marketP: number,
  y: 0 | 1,
  extra?: Partial<Pick<IdenticalRowInput, "sport" | "modelVersion" | "gameId" | "marketPSource">>,
): IdenticalRowInput {
  return {
    pConfidence,
    pIndependent,
    marketP,
    marketPSource: extra?.marketPSource ?? "proof_receipt",
    y,
    sport: extra?.sport ?? "baseball_mlb",
    modelVersion: extra?.modelVersion ?? "v5.2.7",
    gameId: extra?.gameId ?? null,
  };
}

/**
 * Four rows, worked by hand (engine metrics are rounded to 4 places):
 *   A: conf .6  ind .8  mkt .9  y 1
 *   B: conf .6  ind .8  mkt .9  y 1
 *   C: conf .6  ind .4  mkt .3  y 0
 *   D: conf .6  ind .4  mkt .3  y 1
 * base rate .75, uncertainty .75*.25 = .1875 on every score.
 *
 * confidence (p .6 on all four): Brier (3*.16 + .36)/4 = .21; one bin, fk .6
 *   ok .75: ECE .15, REL .0225, RES 0; separation .6 − .6 = 0.
 * independent: Brier (.04+.04+.16+.36)/4 = .15; bins .8 (n2, ok 1) and .4
 *   (n2, ok .5): ECE .5*.2 + .5*.1 = .15; REL .5*.04 + .5*.01 = .025;
 *   RES .5*.0625 + .5*.0625 = .0625; separation (.8+.8+.4)/3 − .4 = .2667.
 * blend (.5*conf + .5*ind): A,B .7; C,D .5. Brier (.09+.09+.25+.25)/4 = .17;
 *   bins .7 (ok 1) and .5 (ok .5): ECE .5*.3 + 0 = .15; REL .5*.09 = .045;
 *   RES .0625; separation (.7+.7+.5)/3 − .5 = .1333.
 * market: A,B .9; C,D .3. Brier (.01+.01+.09+.49)/4 = .15; bins .9 (ok 1) and
 *   .3 (ok .5): ECE .5*.1 + .5*.2 = .15; REL .5*.01 + .5*.04 = .025;
 *   RES .0625; separation (.9+.9+.3)/3 − .3 = .4.
 */
function handRows(): IdenticalRowInput[] {
  return [
    row(0.6, 0.8, 0.9, 1),
    row(0.6, 0.8, 0.9, 1),
    row(0.6, 0.4, 0.3, 0),
    row(0.6, 0.4, 0.3, 1),
  ];
}

function pick(overrides: Partial<PickForIdenticalRows>): PickForIdenticalRows {
  return {
    id: "p1",
    gameId: "g1",
    generatedAt: new Date("2026-09-01T12:00:00Z"),
    selection: "Home",
    homeTeamName: "Home",
    awayTeamName: "Away",
    confidence: 62,
    result: "WIN",
    pickType: "MONEYLINE",
    factorBreakdown: { independentEdge: { trueProb: 0.58 } },
    proofReceipt: { marketFairProb: 0.55 },
    modelVersion: "v5.2.7",
    settledAt: new Date("2026-09-02T03:00:00Z"),
    sportKey: "baseball_mlb",
    ...overrides,
  };
}

describe("scoreIdenticalRows — hand-worked fixture", () => {
  const slice = scoreIdenticalRows(handRows(), { resamples: 50 });
  const by = (score: string) => slice.scores.find((s) => s.score === score)!;

  it("scores every kind on the same n with the hand-worked Brier, ECE, Murphy terms and separation", () => {
    expect(slice.n).toBe(4);
    expect(slice.scores.map((s) => s.score)).toEqual([
      "confidence",
      "independent_trueProb",
      "blend_indep_conf",
      "marketFairProb",
    ]);
    for (const s of slice.scores) expect(s.n).toBe(4);

    const conf = by("confidence");
    expect(conf.brier).toBeCloseTo(0.21, 4);
    expect(conf.ece).toBeCloseTo(0.15, 4);
    expect(conf.murphyReliability).toBeCloseTo(0.0225, 4);
    expect(conf.murphyResolution).toBeCloseTo(0, 4);
    expect(conf.murphyUncertainty).toBeCloseTo(0.1875, 4);
    expect(conf.separation).toBeCloseTo(0, 9);

    const ind = by("independent_trueProb");
    expect(ind.brier).toBeCloseTo(0.15, 4);
    expect(ind.ece).toBeCloseTo(0.15, 4);
    expect(ind.murphyReliability).toBeCloseTo(0.025, 4);
    expect(ind.murphyResolution).toBeCloseTo(0.0625, 4);
    expect(ind.separation).toBeCloseTo(0.8 * 2 / 3 + 0.4 / 3 - 0.4, 9);

    const blend = by("blend_indep_conf");
    expect(blend.brier).toBeCloseTo(0.17, 4);
    expect(blend.ece).toBeCloseTo(0.15, 4);
    expect(blend.murphyReliability).toBeCloseTo(0.045, 4);
    expect(blend.murphyResolution).toBeCloseTo(0.0625, 4);
    expect(blend.separation).toBeCloseTo((0.7 + 0.7 + 0.5) / 3 - 0.5, 9);

    const mkt = by("marketFairProb");
    expect(mkt.brier).toBeCloseTo(0.15, 4);
    expect(mkt.ece).toBeCloseTo(0.15, 4);
    expect(mkt.murphyReliability).toBeCloseTo(0.025, 4);
    expect(mkt.murphyResolution).toBeCloseTo(0.0625, 4);
    expect(mkt.separation).toBeCloseTo((0.9 + 0.9 + 0.3) / 3 - 0.3, 9);
  });

  it("Murphy terms reconcile: Brier = UNC + REL − RES on every score", () => {
    for (const s of slice.scores) {
      expect(s.brier).toBeCloseTo(s.murphyUncertainty! + s.murphyReliability! - s.murphyResolution!, 3);
    }
  });

  it("carries per-score intervals and a paired gap that is null only on the market row", () => {
    for (const s of slice.scores) {
      expect(s.brierCi95?.resamples).toBe(50);
      expect(s.resolutionCi95?.resamples).toBe(50);
      expect(s.brierCi95!.lo).toBeLessThanOrEqual(s.brierCi95!.hi);
    }
    expect(by("marketFairProb").brierGapVsMarketCi95).toBeNull();
    expect(by("confidence").brierGapVsMarketCi95).not.toBeNull();
  });

  it("returns all-null metrics on an empty row set and no intervals on a single row", () => {
    const empty = scoreIdenticalRows([]);
    expect(empty.n).toBe(0);
    expect(empty.scores).toHaveLength(4);
    for (const s of empty.scores) {
      expect(s.brier).toBeNull();
      expect(s.ece).toBeNull();
      expect(s.brierCi95).toBeNull();
    }
    const one = scoreIdenticalRows([row(0.6, 0.7, 0.8, 1)]);
    expect(one.n).toBe(1);
    expect(one.scores[0]!.brier).toBeCloseTo(0.16, 4);
    expect(one.scores[0]!.brierCi95).toBeNull();
    expect(one.scores[0]!.separation).toBeNull();
  });
});

describe("identicalRowProbability", () => {
  it("maps each kind to a win probability and never to an edge", () => {
    const r = row(0.6, 0.8, 0.9, 1);
    expect(identicalRowProbability(r, "confidence")).toBeCloseTo(0.6, 9);
    expect(identicalRowProbability(r, "independent_trueProb")).toBeCloseTo(0.8, 9);
    expect(identicalRowProbability(r, "blend_indep_conf")).toBeCloseTo(0.7, 9);
    expect(identicalRowProbability(r, "marketFairProb")).toBeCloseTo(0.9, 9);
  });
});

describe("bootstrap — seeded, deterministic, paired", () => {
  /**
   * 60 rows where the market is closer to the outcome than confidence on every
   * single row (wins: mkt .9 vs conf .6; losses: mkt .1 vs conf .4). Each row
   * contributes a squared error of .01 on the market and .16 on confidence
   * WHATEVER its outcome, so every resample (any win/loss mix) has market
   * Brier .01 and confidence Brier .16; the paired gap (confidence − market)
   * is exactly .15 in every draw and its interval sits strictly above zero.
   */
  function dominated(): IdenticalRowInput[] {
    const out: IdenticalRowInput[] = [];
    for (let i = 0; i < 60; i++) {
      const y = (i % 2) as 0 | 1;
      out.push(row(y === 1 ? 0.6 : 0.4, y === 1 ? 0.7 : 0.3, y === 1 ? 0.9 : 0.1, y));
    }
    return out;
  }

  it("is deterministic across runs with the default seed", () => {
    const a = buildScoreBakeoffIdenticalRows({ rows: dominated(), candidates: 60, dropped: emptyDrops() });
    const b = buildScoreBakeoffIdenticalRows({ rows: dominated(), candidates: 60, dropped: emptyDrops() });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.bootstrap).toEqual({ resamples: 200, seed: IDENTICAL_ROW_BOOTSTRAP_SEED, paired: true });
  });

  it("changes with the seed, so the interval really is resampled", () => {
    const rows = handRows().concat(handRows(), handRows(), handRows(), handRows());
    const a = scoreIdenticalRows(rows, { seed: 1 });
    const b = scoreIdenticalRows(rows, { seed: 2 });
    const cisA = a.scores.map((s) => [s.brierCi95!.lo, s.brierCi95!.hi]);
    const cisB = b.scores.map((s) => [s.brierCi95!.lo, s.brierCi95!.hi]);
    expect(JSON.stringify(cisA)).not.toBe(JSON.stringify(cisB));
  });

  it("paired gap interval is strictly positive when the market beats confidence on every row", () => {
    const slice = scoreIdenticalRows(dominated());
    const conf = slice.scores.find((s) => s.score === "confidence")!;
    const mkt = slice.scores.find((s) => s.score === "marketFairProb")!;
    expect(conf.brier).toBeCloseTo(0.16, 4);
    expect(mkt.brier).toBeCloseTo(0.01, 4);
    expect(conf.brierGapVsMarketCi95!.lo).toBeCloseTo(0.15, 4);
    expect(conf.brierGapVsMarketCi95!.hi).toBeCloseTo(0.15, 4);
    // Point estimates sit inside their own intervals on a constant-Brier draw.
    expect(conf.brierCi95!.lo).toBeCloseTo(0.16, 4);
    expect(mkt.brierCi95!.hi).toBeCloseTo(0.01, 4);
  });
});

function emptyDrops() {
  return {
    not_win_loss: 0,
    non_moneyline_market: 0,
    three_way_market: 0,
    no_confidence: 0,
    no_independent_trueprob: 0,
    no_market_probability: 0,
  };
}

describe("buildScoreBakeoffIdenticalRows — slices and sensitivity", () => {
  const rows = [
    row(0.6, 0.8, 0.9, 1, { sport: "baseball_mlb", modelVersion: "v5.2.7", gameId: "g1" }),
    row(0.6, 0.8, 0.9, 1, { sport: "baseball_mlb", modelVersion: "v5.2.7", gameId: "g2" }),
    row(0.6, 0.4, 0.3, 0, { sport: "americanfootball_nfl", modelVersion: "v5.2.6", gameId: "g3", marketPSource: "resolver_single_book" }),
    row(0.6, 0.4, 0.3, 1, { sport: "americanfootball_nfl", modelVersion: "v5.2.7", gameId: "g3", marketPSource: "resolver" }),
  ];
  const selection = { rows, candidates: 9, dropped: { ...emptyDrops(), non_moneyline_market: 5 } };

  it("splits by sport and by modelVersion, sorted, with slice n summing to the pooled n", () => {
    const table = buildScoreBakeoffIdenticalRows(selection, { resamples: 20 });
    expect(table.n).toBe(4);
    expect(table.candidates).toBe(9);
    expect(table.dropped.non_moneyline_market).toBe(5);
    expect(table.bySport.map((s) => s.sport)).toEqual(["americanfootball_nfl", "baseball_mlb"]);
    expect(table.bySport.reduce((a, s) => a + s.n, 0)).toBe(4);
    expect(table.byModelVersion.map((s) => s.modelVersion)).toEqual(["v5.2.6", "v5.2.7"]);
    expect(table.byModelVersion.find((s) => s.modelVersion === "v5.2.7")!.n).toBe(3);
    expect(table.marketPSources).toEqual({ proof_receipt: 2, factor_breakdown: 0, resolver: 1, resolver_single_book: 1 });
    // The pooled Brier on the market score is the hand-worked .15 from the four-row fixture.
    expect(table.scores.find((s) => s.score === "marketFairProb")!.brier).toBeCloseTo(0.15, 4);
  });

  it("reports the contradicted-finals sensitivity as NOT RUN with the exact command when no ids are supplied", () => {
    const table = buildScoreBakeoffIdenticalRows(selection, { resamples: 20 });
    expect(table.contradictedFinalsSensitivity.status).toBe("NOT RUN");
    if (table.contradictedFinalsSensitivity.status === "NOT RUN") {
      expect(table.contradictedFinalsSensitivity.command).toBe(VERIFY_SCORES_COMMAND);
      expect(table.contradictedFinalsSensitivity.excludedGameIds).toBe(0);
    }
    const empty = buildScoreBakeoffIdenticalRows(selection, { resamples: 20, excludeGameIds: new Set() });
    expect(empty.contradictedFinalsSensitivity.status).toBe("NOT RUN");
  });

  it("recomputes the table without the contradicted games when ids are supplied", () => {
    const table = buildScoreBakeoffIdenticalRows(selection, { resamples: 20, excludeGameIds: new Set(["g3", "never-seen"]) });
    expect(table.contradictedFinalsSensitivity.status).toBe("ok");
    if (table.contradictedFinalsSensitivity.status === "ok") {
      expect(table.contradictedFinalsSensitivity.excludedGameIds).toBe(2);
      expect(table.contradictedFinalsSensitivity.rowsRemoved).toBe(2);
      expect(table.contradictedFinalsSensitivity.table.n).toBe(2);
      // The two surviving rows are both wins at market .9: Brier .01.
      expect(table.contradictedFinalsSensitivity.table.scores.find((s) => s.score === "marketFairProb")!.brier).toBeCloseTo(0.01, 4);
    }
    // The headline table is untouched by the exclusion.
    expect(table.n).toBe(4);
  });
});

describe("selectIdenticalRows — the calibration loader's resolver order", () => {
  it("keeps only settled two-way moneyline picks carrying every score, counting each drop reason", () => {
    const picks: PickForIdenticalRows[] = [
      pick({ id: "keep-receipt" }),
      pick({ id: "pending", result: "PENDING" }),
      pick({ id: "spread", pickType: "SPREAD" }),
      pick({ id: "soccer", sportKey: "soccer_usa_mls" }),
      pick({ id: "no-conf", confidence: null }),
      pick({ id: "no-indep", factorBreakdown: {} }),
      pick({ id: "no-market", proofReceipt: null, factorBreakdown: { independentEdge: { trueProb: 0.6 } } }),
      pick({ id: "coin-flip-receipt", proofReceipt: { marketFairProb: 0.5 }, factorBreakdown: { independentEdge: { trueProb: 0.6 } } }),
    ];
    const sel = selectIdenticalRows(picks);
    expect(sel.candidates).toBe(8);
    expect(sel.rows).toHaveLength(1);
    expect(sel.dropped).toEqual({
      not_win_loss: 1,
      non_moneyline_market: 1,
      three_way_market: 1,
      no_confidence: 1,
      no_independent_trueprob: 1,
      no_market_probability: 2,
    });
    const kept = sel.rows[0]!;
    expect(kept.pConfidence).toBeCloseTo(0.62, 9);
    expect(kept.pIndependent).toBeCloseTo(0.58, 9);
    expect(kept.marketP).toBeCloseTo(0.55, 9);
    expect(kept.marketPSource).toBe("proof_receipt");
    expect(kept.gameId).toBe("g1");
    expect(kept.sport).toBe("baseball_mlb");
  });

  it("reads the receipt before the factor breakdown, where the by-market bake-off does the opposite", () => {
    const p = pick({
      proofReceipt: { marketFairProb: 0.7 },
      factorBreakdown: { independentEdge: { trueProb: 0.6, marketFairProb: 0.65 } },
    });
    const sel = selectIdenticalRows([p]);
    expect(sel.rows[0]!.marketP).toBeCloseTo(0.7, 9);
    expect(sel.rows[0]!.marketPSource).toBe("proof_receipt");
    // The existing bake-off row builder resolves the same pick to the factor-breakdown value.
    const legacy = toProvenPathPickRow({ ...p, result: "WIN", confidence: 62, game: { sport: { key: "baseball_mlb" } } });
    expect(legacy!.marketP).toBeCloseTo(0.65, 9);
  });

  it("falls back to the factor breakdown, then to the injected resolver, and tags the source", () => {
    const fbOnly = pick({ id: "fb", proofReceipt: null, factorBreakdown: { independentEdge: { trueProb: 0.6 }, marketFairProb: 0.61 } });
    const resolverOnly = pick({ id: "res", proofReceipt: null, factorBreakdown: { independentEdge: { trueProb: 0.6 } } });
    const sel = selectIdenticalRows([fbOnly, resolverOnly], (candidate) =>
      candidate.id === "res" ? { p: 0.57, source: "resolver_single_book" } : null,
    );
    expect(sel.rows.map((r) => [r.marketPSource, r.marketP])).toEqual([
      ["factor_breakdown", 0.61],
      ["resolver_single_book", 0.57],
    ]);
  });
});

describe("buildProvenPathPlan — identical-row table rides on the plan without touching it", () => {
  function planRows() {
    const out = [];
    for (let i = 0; i < 120; i++) {
      const p = [0.6, 0.7, 0.8][i % 3]!;
      const y = (Math.floor(i / 3) / 40 < p ? 1 : 0) as 0 | 1;
      out.push({ pConfidence: 0.5 + (i % 10) * 0.02, pIndependent: 0.55 + (i % 4) * 0.05, marketP: p, y, groupKey: "americanfootball_nfl|MONEYLINE" });
    }
    return out;
  }

  it("attaches scoreBakeoffIdenticalRows only when a selection is supplied and leaves bestScore and scoreBakeoff identical", () => {
    const without = buildProvenPathPlan(planRows(), { minN: 40 });
    const selection = { rows: handRows(), candidates: 4, dropped: emptyDrops() };
    const withTable = buildProvenPathPlan(planRows(), { minN: 40, identicalRows: selection });
    expect(without.scoreBakeoffIdenticalRows).toBeUndefined();
    expect(withTable.scoreBakeoffIdenticalRows?.n).toBe(4);
    expect(withTable.bestScore).toBe(without.bestScore);
    expect(withTable.scoreBakeoff).toEqual(without.scoreBakeoff);
    expect(withTable.scoreBakeoffByMarket).toEqual(without.scoreBakeoffByMarket);
    expect(withTable.pauseGroups).toEqual(without.pauseGroups);
    expect(withTable.defaultDelta).toBe(without.defaultDelta);
    expect(withTable.floorsUnchanged).toBe(true);
  });

  it("survives a JSON round trip with no NaN (the durable plan is stored as JSON)", () => {
    const selection = { rows: handRows(), candidates: 4, dropped: emptyDrops() };
    const plan = buildProvenPathPlan(planRows(), { minN: 40, identicalRows: selection });
    const text = JSON.stringify(plan.scoreBakeoffIdenticalRows);
    expect(text).not.toContain("NaN");
    const back = JSON.parse(text) as { n: number; scores: { brier: number }[] };
    expect(back.n).toBe(4);
    expect(back.scores[0]!.brier).toBeCloseTo(0.21, 4);
  });
});
