#!/usr/bin/env node
/**
 * Tests for the free scoreboard auto-settlement daemon.
 *
 *   node --test scripts/ops/free-auto-settle.test.mjs
 *
 * Every fixture here is a TEST fixture defining an arithmetic expectation
 * (4 > 3.5 therefore OVER wins). None of it is product data: the daemon itself
 * never invents a pick, and Law 8 is about the daemon, not about the test that
 * proves the daemon's arithmetic.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  BET_TYPES,
  SPORTS,
  UsageError,
  brierContribution,
  computeClv,
  evaluatePick,
  extractFinals,
  loadSnapshotPicks,
  matchFinal,
  overUnderSide,
  parseArgs,
  probabilityOf,
  realizedBrier,
  resolveSide,
  summarize,
} from "./free-auto-settle.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FINAL_KC_27_BUF_24 = {
  gameId: "401",
  state: "post",
  completed: true,
  statusDetail: "Final",
  home: { abbreviation: "KC", score: 27 },
  away: { abbreviation: "BUF", score: 24 },
};

const FINAL_TIE = {
  gameId: "402",
  state: "post",
  completed: true,
  statusDetail: "Final/OT",
  home: { abbreviation: "DET", score: 20 },
  away: { abbreviation: "CHI", score: 20 },
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

test("defaults to dry-run and writes nothing", () => {
  const opts = parseArgs([]);
  assert.equal(opts.dryRun, true);
  assert.equal(opts.live, false);
  assert.equal(opts.sport, null);
  assert.equal(opts.json, false);
});

test("--live flips dry-run off and dry-run flips it back", () => {
  assert.equal(parseArgs(["--live"]).live, true);
  assert.equal(parseArgs(["--live"]).dryRun, false);
  const back = parseArgs(["--live", "--dry-run"]);
  assert.equal(back.dryRun, true);
  assert.equal(back.live, false);
});

test("--sport accepts both spaced and = forms, and rejects an unknown sport", () => {
  assert.equal(parseArgs(["--sport", "nfl"]).sport, "nfl");
  assert.equal(parseArgs(["--sport=MLB"]).sport, "mlb");
  assert.throws(() => parseArgs(["--sport", "cricket"]), UsageError);
});

test("unknown flags are refused rather than ignored", () => {
  assert.throws(() => parseArgs(["--settle-everything"]), UsageError);
});

test("all seven sports are covered", () => {
  assert.deepEqual([...SPORTS], ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"]);
  assert.deepEqual([...BET_TYPES], ["MONEYLINE", "SPREAD", "TOTAL"]);
});

// ---------------------------------------------------------------------------
// Moneyline
// ---------------------------------------------------------------------------

test("moneyline grades the winner, both sides", () => {
  const home = evaluatePick({ betType: "MONEYLINE", side: "HOME" }, FINAL_KC_27_BUF_24);
  assert.equal(home.result, "WIN");

  const away = evaluatePick({ betType: "MONEYLINE", side: "AWAY" }, FINAL_KC_27_BUF_24);
  assert.equal(away.result, "LOSS");
});

test("moneyline resolves the side from a team abbreviation in the selection", () => {
  assert.equal(resolveSide({ selection: "KC ML" }, FINAL_KC_27_BUF_24), "HOME");
  assert.equal(resolveSide({ selection: "BUF ML" }, FINAL_KC_27_BUF_24), "AWAY");
  // Documented behaviour: the match is a substring test, so "BUFFALO" also
  // resolves via the BUF token. That is deliberate (the pipeline stores both
  // forms) and it is why the daemon requires the abbreviation to appear at
  // all rather than fuzzy-matching city names.
  assert.equal(resolveSide({ selection: "Buffalo Bills ML" }, FINAL_KC_27_BUF_24), "AWAY");
  // A team not in this fixture resolves to nothing -> the pick voids.
  assert.equal(resolveSide({ selection: "Dallas Cowboys ML" }, FINAL_KC_27_BUF_24), null);
});

test("a tied final is a PUSH, never silently a loss", () => {
  const r = evaluatePick({ betType: "MONEYLINE", side: "HOME" }, FINAL_TIE);
  assert.equal(r.result, "PUSH");
});

// ---------------------------------------------------------------------------
// Spread
// ---------------------------------------------------------------------------

test("spread: home favourite covering and failing", () => {
  // KC won by 3. Laying -2.5 covers; laying -3.5 does not.
  assert.equal(
    evaluatePick({ betType: "SPREAD", side: "HOME", line: -2.5 }, FINAL_KC_27_BUF_24).result,
    "WIN",
  );
  assert.equal(
    evaluatePick({ betType: "SPREAD", side: "HOME", line: -3.5 }, FINAL_KC_27_BUF_24).result,
    "LOSS",
  );
});

test("spread: the underdog side is the mirror image", () => {
  // BUF lost by 3: +3.5 covers, +2.5 does not.
  assert.equal(
    evaluatePick({ betType: "SPREAD", side: "AWAY", line: 3.5 }, FINAL_KC_27_BUF_24).result,
    "WIN",
  );
  assert.equal(
    evaluatePick({ betType: "SPREAD", side: "AWAY", line: 2.5 }, FINAL_KC_27_BUF_24).result,
    "LOSS",
  );
});

test("spread: landing exactly on the number is a PUSH", () => {
  // KC won by exactly 3. A -3 line pushes.
  assert.equal(
    evaluatePick({ betType: "SPREAD", side: "HOME", line: -3 }, FINAL_KC_27_BUF_24).result,
    "PUSH",
  );
});

// ---------------------------------------------------------------------------
// Total
// ---------------------------------------------------------------------------

test("total: over and under on the combined score", () => {
  // 27 + 24 = 51.
  assert.equal(
    evaluatePick({ betType: "TOTAL", side: "OVER", line: 48.5 }, FINAL_KC_27_BUF_24).result,
    "WIN",
  );
  assert.equal(
    evaluatePick({ betType: "TOTAL", side: "UNDER", line: 48.5 }, FINAL_KC_27_BUF_24).result,
    "LOSS",
  );
  assert.equal(
    evaluatePick({ betType: "TOTAL", side: "UNDER", line: 54.5 }, FINAL_KC_27_BUF_24).result,
    "WIN",
  );
});

test("total: landing exactly on the number is a PUSH", () => {
  assert.equal(
    evaluatePick({ betType: "TOTAL", side: "OVER", line: 51 }, FINAL_KC_27_BUF_24).result,
    "PUSH",
  );
});

// ---------------------------------------------------------------------------
// Voids — a void is a void, never a loss
// ---------------------------------------------------------------------------

test("a final with no numeric scores voids the pick", () => {
  const noScore = { home: { abbreviation: "KC", score: null }, away: { abbreviation: "BUF", score: 24 } };
  assert.equal(evaluatePick({ betType: "MONEYLINE", side: "HOME" }, noScore).result, "VOID");
});

test("a missing line voids a spread or total instead of guessing", () => {
  assert.equal(evaluatePick({ betType: "SPREAD", side: "HOME" }, FINAL_KC_27_BUF_24).result, "VOID");
  assert.equal(evaluatePick({ betType: "TOTAL", side: "OVER" }, FINAL_KC_27_BUF_24).result, "VOID");
});

test("an explicit null line voids rather than becoming a real 0 line", () => {
  // Number(null) === 0, and 0 is a gradable line — so a naive coercion would
  // silently grade these as pick'em bets.
  const spread = evaluatePick({ betType: "SPREAD", side: "HOME", line: null }, FINAL_KC_27_BUF_24);
  assert.equal(spread.result, "VOID");
  assert.match(spread.detail, /line/);
  assert.equal(evaluatePick({ betType: "TOTAL", side: "OVER", line: null }, FINAL_KC_27_BUF_24).result, "VOID");
});

test("total sides are read from the stored spellings", () => {
  assert.equal(overUnderSide({ side: "OVER" }), "OVER");
  assert.equal(overUnderSide({ selection: "under 48.5" }), "UNDER");
  assert.equal(overUnderSide({ side: "O 51" }), "OVER");
  assert.equal(overUnderSide({ side: "U48" }), "UNDER");
  assert.equal(overUnderSide({ side: "KC" }), null);
  assert.equal(overUnderSide({}), null);
  // A total with no direction voids rather than defaulting to the over.
  assert.equal(evaluatePick({ betType: "TOTAL", side: "KC", line: 48.5 }, FINAL_KC_27_BUF_24).result, "VOID");
});

test("an unsupported bet type and an unresolvable side both void", () => {
  assert.equal(
    evaluatePick({ betType: "FIRST_TOUCHDOWN", side: "HOME" }, FINAL_KC_27_BUF_24).result,
    "VOID",
  );
  assert.equal(evaluatePick({ betType: "MONEYLINE", side: "" }, FINAL_KC_27_BUF_24).result, "VOID");
});

// ---------------------------------------------------------------------------
// Brier
// ---------------------------------------------------------------------------

test("Brier uses the stated probability and excludes pushes and voids", () => {
  const win = { trueProb: 0.7 };
  const loss = { trueProb: 0.7 };
  const push = { trueProb: 0.7 };

  // Tolerance, not strict equality: (0.7 - 1)^2 is 0.09000000000000002 in IEEE754.
  assert.ok(Math.abs(brierContribution(win, "WIN") - 0.09) < 1e-12); // (0.7 - 1)^2
  assert.ok(Math.abs(brierContribution(loss, "LOSS") - 0.49) < 1e-12); // (0.7 - 0)^2
  assert.equal(brierContribution(push, "PUSH"), null);
  assert.equal(brierContribution(win, "VOID"), null);

  const { brier, n } = realizedBrier([
    { pick: win, evaluation: { result: "WIN" } },
    { pick: loss, evaluation: { result: "LOSS" } },
    { pick: push, evaluation: { result: "PUSH" } },
  ]);
  assert.equal(n, 2);
  assert.ok(Math.abs(brier - (0.09 + 0.49) / 2) < 1e-12);
});

test("a pick with no probability contributes no Brier sample", () => {
  const { brier, n } = realizedBrier([{ pick: {}, evaluation: { result: "WIN" } }]);
  assert.equal(n, 0);
  assert.equal(brier, null);
});

test("probability is read from the nested factor breakdown when not top level", () => {
  assert.equal(probabilityOf({ trueProb: 0.61 }), 0.61);
  assert.equal(probabilityOf({ factorBreakdown: { independentEdge: { trueProb: 0.42 } } }), 0.42);
  assert.equal(probabilityOf({ confidence: 72 }), null); // a score is NOT a probability
  assert.equal(probabilityOf({}), null);
});

// ---------------------------------------------------------------------------
// CLV
// ---------------------------------------------------------------------------

test("CLV sign is oriented to the side that benefits", () => {
  // Backing the favourite: the line moving from -6 to -7 is +1 of value.
  assert.equal(computeClv(-6, -7, "HOME"), 1);
  // Backing the over: the total falling from 48 to 47 is +1 of value.
  assert.equal(computeClv(48, 47, "OVER"), 1);
  // Backing the under: the total RISING is what helps.
  assert.equal(computeClv(48, 49, "UNDER"), 1);
  assert.equal(computeClv(48, 49, "OVER"), -1);
});

test("CLV is null when no closing price exists — it is not invented", () => {
  assert.equal(computeClv(-6, undefined, "HOME"), null);
  assert.equal(computeClv(undefined, -7, "HOME"), null);
  assert.equal(computeClv(-6, null, "HOME"), null);
});

// ---------------------------------------------------------------------------
// Finals extraction and matching
// ---------------------------------------------------------------------------

test("only completed, post-state, scored games count as finals", () => {
  const games = [
    { completed: true, state: "post", home: { score: 27 }, away: { score: 24 } },
    { completed: false, state: "in", home: { score: 10 }, away: { score: 7 } },
    { completed: false, state: "pre", home: { score: null }, away: { score: null } },
    { completed: true, state: "post", home: { score: null }, away: { score: 24 } },
  ];
  assert.equal(extractFinals(games).length, 1);
});

test("matching finds the final on either orientation", () => {
  const pool = [FINAL_KC_27_BUF_24];
  assert.equal(matchFinal({ homeAbbr: "KC", awayAbbr: "BUF" }, pool)?.gameId, "401");
  assert.equal(matchFinal({ homeAbbr: "BUF", awayAbbr: "KC" }, pool)?.gameId, "401");
  assert.equal(matchFinal({ homeAbbr: "DAL", awayAbbr: "PHI" }, pool), null);
});

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

test("summarize counts per sport and excludes pushes from the win rate", () => {
  const settled = [
    { sport: "nfl", evaluation: { result: "WIN" } },
    { sport: "nfl", evaluation: { result: "LOSS" } },
    { sport: "nfl", evaluation: { result: "PUSH" } },
    { sport: "mlb", evaluation: { result: "WIN" } },
    { sport: "mlb", evaluation: { result: "VOID" } },
  ];
  const s = summarize(settled);
  assert.equal(s.overall.total, 5);
  assert.equal(s.decided, 3);
  assert.equal(s.overall.pushes, 1);
  assert.equal(s.overall.voids, 1);
  assert.ok(Math.abs(s.winRate - 2 / 3) < 1e-12);
  assert.equal(s.bySport.nfl.total, 3);
});

test("a win rate is null, not zero, when nothing is decided", () => {
  const s = summarize([{ sport: "nhl", evaluation: { result: "PUSH" } }]);
  assert.equal(s.winRate, null);
});

// ---------------------------------------------------------------------------
// Snapshot loading (dry-run source)
// ---------------------------------------------------------------------------

test("a missing snapshot is reported as absent rather than invented", () => {
  const loaded = loadSnapshotPicks("C:/definitely/not/here/pending-picks.json");
  assert.equal(loaded.present, false);
  assert.deepEqual(loaded.picks, []);
});
