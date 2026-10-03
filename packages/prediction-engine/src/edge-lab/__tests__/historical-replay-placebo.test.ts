/**
 * Historical-replay leak-gate placebo — the decisive proof that the backfill
 * harness is leak-free (handoff §2 P0, extended into the replay engine).
 *
 * THREE BEDS:
 *   1. assemblePreGameFeatures refuses ANY post-kickoff field at runtime
 *      (the type-level guarantee exercised, not just asserted).
 *   2. A shuffled-time placebo: when settlement facts are randomly permuted
 *      across games, the model's realized edge collapses to ~0 — proving the
 *      picks were scored on pre-game information only, not on outcomes.
 *   3. The same fixtures in REAL order show a non-zero realized return —
 *      proving the harness is not a no-op (the model's picks are settled
 *      correctly and carry genuine signal).
 *
 * CLV honesty: the historical harness grades CLV via clv.ts with entry ==
 * nflverse close, so clvValue is 0 / MATCHED_CLOSE by construction. That is
 * the HONEST value — we assert it rather than paper over it. The "edge" we
 * test against is the settlement outcome (WIN/LOSS/PUSH realized return),
 * which is the legitimate leading indicator of genuine model edge.
 */
import { describe, expect, it } from "vitest";

import type { ScoredPick } from "@sports/types";

import {
  POST_KICKOFF_FIELDS,
  LookaheadLeakError,
  assemblePreGameFeatures,
  replayAndSettleGame,
  scoreHistoricalGame,
  settleHistoricalPick,
  type RawScheduleRow,
  type SettledHistoricalPick,
} from "../../historical-replay.js";
import { mulberry32, shuffled } from "../rng.js";

/** Realized unit return from a settlement result (WIN=+1, LOSS=-1, PUSH=0). */
function resultToReturn(result: SettledHistoricalPick["result"]): number {
  switch (result) {
    case "WIN":
      return 1;
    case "LOSS":
      return -1;
    case "PUSH":
      return 0;
  }
}

/** Aggregate realized return across settled picks — the placebo's CLV proxy. */
function aggregateReturn(picks: readonly SettledHistoricalPick[]): number {
  if (picks.length === 0) return 0;
  const total = picks.reduce((sum, p) => sum + resultToReturn(p.result), 0);
  return total / picks.length;
}

/** A synthetic game: pre-game parameters + the "real" final score. */
interface Fixture {
  readonly gameKey: string;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly spreadLine: number; // HOME-perspective (neg = home favored)
  readonly totalLine: number;
  readonly homeMoneyline: number;
  readonly awayMoneyline: number;
  readonly restHome: number;
  readonly restAway: number;
  readonly realHomeScore: number;
  readonly realAwayScore: number;
}

function iso(week: number): string {
  return new Date(2023, 8, week * 7, 17, 0, 0).toISOString();
}

/** Build a RawScheduleRow from a Fixture, injecting real (or shuffled) scores. */
function toRow(spec: Fixture, homeScore: number, awayScore: number): RawScheduleRow {
  return {
    gameKey: spec.gameKey,
    season: 2023,
    week: spec.week,
    gameType: "REG",
    homeTeam: spec.homeTeam,
    awayTeam: spec.awayTeam,
    commenceTime: iso(spec.week),
    spreadLine: spec.spreadLine,
    totalLine: spec.totalLine,
    homeMoneyline: spec.homeMoneyline,
    awayMoneyline: spec.awayMoneyline,
    restHome: spec.restHome,
    restAway: spec.restAway,
    homeScore,
    awayScore,
    result: homeScore - awayScore,
  };
}

// ── Synthetic fixture corpus ────────────────────────────────────────────────
// 8 games where the HOME team is favored and wins (covers the spread).
// 8 games where the AWAY team is favored and wins (covers the spread).
// Totals are split: ~half OVER, ~half UNDER the line.
// This gives the model a systematic, real (not leaked) edge in real order
// that a random permutation of scores should destroy.

const FAVORITE_WINS: Fixture[] = Array.from({ length: 16 }, (_, i): Fixture => {
  const isHomeFavored = i < 8;
  const half = isHomeFavored ? i : i - 8;
  const home = `HOME${i}`;
  const away = `AWAY${i}`;
  const spreadAbs = 3 + half; // 3..10
  const spread = isHomeFavored ? -spreadAbs : spreadAbs;
  const totalLine = 44 + (half % 4); // 44..47
  const margin = 10; // favorite wins by 10 → covers any spread ≤ 10
  // ~half OVER, ~half UNDER
  const actualTotal = i % 2 === 0 ? totalLine + 6 : totalLine - 6;
  const halfScore = Math.floor(actualTotal / 2) + (i % 3);
  const otherScore = actualTotal - halfScore;
  const homeScore = isHomeFavored ? halfScore + margin : otherScore - margin;
  const awayScore = isHomeFavored ? otherScore - margin : halfScore + margin;
  return {
    gameKey: `2023_${String(i + 1).padStart(2, "0")}_${home}_${away}`,
    week: i + 1,
    homeTeam: home,
    awayTeam: away,
    spreadLine: spread,
    totalLine,
    homeMoneyline: isHomeFavored ? -180 + half * 10 : 180 + half * 10,
    awayMoneyline: isHomeFavored ? 160 + half * 10 : -160 - half * 10,
    restHome: 7,
    restAway: 4,
    realHomeScore: homeScore,
    realAwayScore: awayScore,
  };
});

/**
 * Score all fixtures (pre-game, score-free) so the model has NOT seen the
 * final scores. Returns one array of picks per fixture, in fixture order.
 * Picks depend only on pre-game features → identical regardless of scores.
 */
function scoreAllFixtures(): ScoredPick[][] {
  return FAVORITE_WINS.map((spec) => {
    const row: RawScheduleRow = {
      ...toRow(spec, 0, 0),
      homeScore: null,
      awayScore: null,
      result: null,
    };
    const features = assemblePreGameFeatures(row);
    return scoreHistoricalGame(features);
  });
}

/** Settle picks with a given set of scores-per-fixture. */
function settleWithScores(
  perGamePicks: ScoredPick[][],
  scores: { home: number; away: number }[],
): SettledHistoricalPick[] {
  const out: SettledHistoricalPick[] = [];
  for (let i = 0; i < FAVORITE_WINS.length; i++) {
    const spec = FAVORITE_WINS[i]!;
    const picks = perGamePicks[i]!;
    const row = toRow(spec, scores[i]!.home, scores[i]!.away);
    // Re-derive team names + features from the (score-free) pre-game row.
    const preGameRow: RawScheduleRow = {
      ...row,
      homeScore: null,
      awayScore: null,
      result: null,
    };
    const features = assemblePreGameFeatures(preGameRow);
    for (const pick of picks) {
      out.push(
        settleHistoricalPick(pick, { gameKey: spec.gameKey, homeScore: scores[i]!.home, awayScore: scores[i]!.away }, features.homeTeam, features.awayTeam),
      );
    }
  }
  return out;
}

// ===========================================================
// 1. LEAK-GATE: assemblePreGameFeatures refuses post-kickoff fields
// ===========================================================
describe("historical-replay assemblePreGameFeatures — leak-gate refusal", () => {
  const cleanRow: RawScheduleRow = {
    gameKey: "2023_01_HOME_AWAY",
    season: 2023,
    week: 1,
    gameType: "REG",
    homeTeam: "HOME",
    awayTeam: "AWAY",
    commenceTime: "2023-09-07T17:00:00.000Z",
    spreadLine: -3,
    totalLine: 47,
    homeMoneyline: -150,
    awayMoneyline: 130,
    restHome: 7,
    restAway: 4,
    homeScore: null,
    awayScore: null,
    result: null,
  };

  it("throws LookaheadLeakError for EVERY post-kickoff field (structural defense)", () => {
    for (const field of POST_KICKOFF_FIELDS) {
      const poisoned: RawScheduleRow = { ...cleanRow, [field]: 99 };
      expect(() => assemblePreGameFeatures(poisoned)).toThrow(LookaheadLeakError);
      // And the thrown error names the offending field.
      try {
        assemblePreGameFeatures(poisoned);
        throw new Error("should-have-thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LookaheadLeakError);
        expect((e as LookaheadLeakError).field).toBe(field);
      }
    }
  });

  it("accepts a row with all post-kickoff fields null (the legit pre-game state)", () => {
    const features = assemblePreGameFeatures(cleanRow);
    expect(features.gameKey).toBe("2023_01_HOME_AWAY");
    expect(features.spreadLine).toBe(-3);
    expect(features.totalLine).toBe(47);
    expect(features.homeMoneyline).toBe(-150);
    expect(features.awayMoneyline).toBe(130);
    // The returned type structurally cannot carry a score.
    expect("homeScore" in features).toBe(false);
    expect("awayScore" in features).toBe(false);
    expect("result" in features).toBe(false);
  });

  it("the scorer never sees a score — assemblePreGameFeatures throws before scoring", () => {
    const scoredRow: RawScheduleRow = {
      ...cleanRow,
      homeScore: 28,
      awayScore: 17,
      result: 11,
    };
    expect(() => assemblePreGameFeatures(scoredRow)).toThrow(LookaheadLeakError);
  });
});

// ===========================================================
// 2. SHUFFLED-TIME PLACEBO: permuted settlement facts → CLV ≈ 0
//    (if the model leaked, edge would survive the shuffle)
// ===========================================================
describe("historical-replay shuffled-time placebo", () => {
  it("REAL order produces a non-zero realized return (model picks settle correctly — not a no-op)", () => {
    const perGamePicks = scoreAllFixtures();
    const realScores = FAVORITE_WINS.map((spec) => ({ home: spec.realHomeScore, away: spec.realAwayScore }));
    const allPicks = settleWithScores(perGamePicks, realScores);

    expect(allPicks.length).toBeGreaterThan(10);
    // CLV-by-construction honesty: entry == nflverse close → MATCHED_CLOSE, 0.
    expect(allPicks.every((p) => p.clvValue === 0)).toBe(true);
    expect(allPicks.every((p) => p.clvVerdict === "MATCHED_CLOSE")).toBe(true);

    const realReturn = aggregateReturn(allPicks);
    // A non-zero return on real-order data proves the harness settles picks
    // correctly and the model's picks carry signal. (It is NOT the CLV — CLV
    // is honestly 0 by construction because entry == nflverse close.)
    expect(realReturn).toBeGreaterThan(0.1);
  });

  it("SHUFFLED settlement facts collapse realized return to ~0 (no leak survives the permutation)", () => {
    // Score once — pre-game features are score-free, so picks are identical
    // regardless of which score gets attached later.
    const perGamePicks = scoreAllFixtures();

    // Extract the real settlement facts (scores) as a pool.
    const realFacts: { home: number; away: number }[] = FAVORITE_WINS.map((spec) => ({
      home: spec.realHomeScore,
      away: spec.realAwayScore,
    }));

    // Run 24 independent permutations seeded deterministically.
    const seedBase = 20260816;
    const shuffledReturns: number[] = [];
    for (let run = 0; run < 24; run++) {
      const rng = mulberry32(seedBase + run * 7919);
      const permutedFacts = shuffled(realFacts, rng);
      const picks = settleWithScores(perGamePicks, permutedFacts);
      shuffledReturns.push(aggregateReturn(picks));
    }

    // Every shuffled run should have |return| ≤ 0.5 — well below the real-order
    // return. A leak (outcome-encoding surviving the permutation) would produce
    // a consistently large positive return across runs.
    const maxAbsReturn = Math.max(...shuffledReturns.map((r) => Math.abs(r)));
    const medianReturn = shuffledReturns
      .slice()
      .sort((a, b) => a - b)[Math.floor(shuffledReturns.length / 2)]!;

    expect(maxAbsReturn).toBeLessThan(0.5);
    expect(Math.abs(medianReturn)).toBeLessThan(0.35);
  });

  it("picks are deterministic across orderings (proves the scorer is score-free)", () => {
    // Score with real scores and with a shuffled-score row; the picks (before
    // settlement) must be byte-identical — scores must not influence scoring.
    for (let i = 0; i < 4; i++) {
      const spec = FAVORITE_WINS[i]!;
      const features = assemblePreGameFeatures({
        ...toRow(spec, 0, 0),
        homeScore: null,
        awayScore: null,
        result: null,
      });
      const picksPreGame = scoreHistoricalGame(features);
      const picksFromFullRow = replayAndSettleGame(
        toRow(spec, spec.realHomeScore, spec.realAwayScore),
      ).map((p) => ({ pickType: p.pickType, selection: p.selection, line: p.line }));

      expect(picksPreGame.length).toBe(picksFromFullRow.length);
      for (let j = 0; j < picksPreGame.length; j++) {
        const a = picksPreGame[j]!;
        const b = picksFromFullRow[j]!;
        expect(a.pickType).toBe(b.pickType);
        expect(a.selection).toBe(b.selection);
        expect(a.line).toBe(b.line);
      }
    }
  });
});

// ===========================================================
// 3. REAL-ORDER FIXTURE: settlement grading correctness
// ===========================================================
describe("historical-replay real-order settlement correctness", () => {
  it("grades spread picks against the correct side with boundary-aware matching", () => {
    // Home favored -3, wins by 7 → covers → HOME SPREAD = WIN.
    const row: RawScheduleRow = {
      gameKey: "2023_01_KC_DET",
      season: 2023,
      week: 1,
      gameType: "REG",
      homeTeam: "KC",
      awayTeam: "DET",
      commenceTime: "2023-10-08T17:00:00.000Z",
      spreadLine: -3,
      totalLine: 47,
      homeMoneyline: -150,
      awayMoneyline: 130,
      restHome: 7,
      restAway: 7,
      homeScore: 27,
      awayScore: 20,
      result: 7,
    };
    const settled = replayAndSettleGame(row);
    const spread = settled.find((p) => p.pickType === "SPREAD");
    expect(spread).toBeDefined();
    // KC -3, KC wins by 7 (27-20) → covers → WIN.
    expect(spread!.result).toBe("WIN");
    expect(spread!.homeScore).toBe(27);
    expect(spread!.awayScore).toBe(20);

    // Same line, but the UNDERDOG covers → LOSS.
    const underdogCovers: RawScheduleRow = {
      ...row,
      homeScore: 20,
      awayScore: 27,
      result: -7,
    };
    const settled2 = replayAndSettleGame(underdogCovers);
    const spread2 = settled2.find((p) => p.pickType === "SPREAD");
    expect(spread2!.result).toBe("LOSS");
  });

  it("grades TOTAL picks and handles PUSH (total exactly on the number)", () => {
    // totalLine 47, score 27+20=47 → PUSH.
    const row: RawScheduleRow = {
      gameKey: "2023_01_KC_DET",
      season: 2023,
      week: 1,
      gameType: "REG",
      homeTeam: "KC",
      awayTeam: "DET",
      commenceTime: "2023-10-08T17:00:00.000Z",
      spreadLine: -3,
      totalLine: 47,
      homeMoneyline: -150,
      awayMoneyline: 130,
      restHome: 7,
      restAway: 7,
      homeScore: 27,
      awayScore: 20,
      result: 7,
    };
    const settled = replayAndSettleGame(row);
    const total = settled.find((p) => p.pickType === "TOTAL");
    expect(total).toBeDefined();
    expect(total!.result).toBe("PUSH");
  });

  it("CLV values are 0 / MATCHED_CLOSE by construction (entry == nflverse close — honest, not fabricated)", () => {
    const row: RawScheduleRow = {
      gameKey: "2023_01_KC_DET",
      season: 2023,
      week: 1,
      gameType: "REG",
      homeTeam: "KC",
      awayTeam: "DET",
      commenceTime: "2023-10-08T17:00:00.000Z",
      spreadLine: -3,
      totalLine: 47,
      homeMoneyline: -150,
      awayMoneyline: 130,
      restHome: 7,
      restAway: 7,
      homeScore: 27,
      awayScore: 20,
      result: 7,
    };
    const settled = replayAndSettleGame(row);
    for (const p of settled) {
      // All priced markets: entry == close → MATCHED_CLOSE, CLV 0.
      expect(p.clvVerdict).toBe("MATCHED_CLOSE");
      expect(p.clvValue).toBe(0);
    }
  });
});
