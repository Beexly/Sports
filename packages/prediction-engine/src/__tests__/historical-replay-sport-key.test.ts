import { describe, it, expect } from "vitest";
import {
  buildHistoricalOddsInput,
  assemblePreGameFeatures,
  replayAndSettleGame,
  settleHistoricalPick,
  scoreHistoricalGame,
  extractSettlementFacts,
  DEFAULT_REPLAY_SPORT_KEY,
  type RawScheduleRow,
} from "../historical-replay.js";

/**
 * The replay is sport-agnostic in everything but two string literals. This pins
 * the parameterisation, and — more importantly — pins that NFL output did not move.
 *
 * `RawScheduleRow` never carried anything NFL-specific: gameKey, season, week,
 * teams, commenceTime, spread/total/moneyline, rest. Only two lines hardcoded the
 * sport, and they sit on opposite sides of the pre-game / post-game split:
 *
 *   buildHistoricalOddsInput -> OddsInput.sport   (what the model SCORES under)
 *   settleHistoricalPick     -> calculatePickResult sportKey (how a TIE GRADES)
 *
 * Threading one option to both is the point. If they could drift, a pick could be
 * scored as soccer (moneyline suppressed) but graded as NFL (a draw = PUSH instead
 * of LOSS), or the reverse — a silent, corpus-poisoning inconsistency.
 */

const baseRow = (overrides: Partial<RawScheduleRow> = {}): RawScheduleRow => ({
  gameKey: "2023_05_DET_KC",
  season: 2023,
  week: 5,
  gameType: "REG",
  homeTeam: "KC",
  awayTeam: "DET",
  commenceTime: "2023-10-08T17:00:00.000Z",
  spreadLine: -3, // repo convention: negative = home favored
  totalLine: 47,
  homeMoneyline: -150,
  awayMoneyline: 130,
  restHome: 7,
  restAway: 7,
  homeScore: 27,
  awayScore: 20,
  result: 7,
  ...overrides,
});

const preGame = () =>
  assemblePreGameFeatures(baseRow({ homeScore: null, awayScore: null, result: null }));

/**
 * Moneyline only publishes on a heavy favourite — probed against this engine:
 * -150 yields no moneyline pick at all, -1225 does. Any case that needs a
 * moneyline to exist must use this row, or its assertion is vacuous. (The first
 * draft of the soccer case below used the -150 row; its CONTROL went red, which
 * is exactly what the control is for.)
 */
const heavyMlRow = (overrides: Partial<RawScheduleRow> = {}): RawScheduleRow =>
  baseRow({ homeMoneyline: -1225, awayMoneyline: 825, ...overrides });

describe("historical replay — sport key is a parameter, NFL is the default", () => {
  it("REGRESSION GUARD: omitting the option reproduces the exact NFL pick set", () => {
    // The half that matters. If parameterisation changed anything that ships,
    // this fails. Compared field-by-field, not just by count.
    const before = replayAndSettleGame(baseRow());
    const after = replayAndSettleGame(baseRow(), undefined);
    const explicitNfl = replayAndSettleGame(baseRow(), { sportKey: DEFAULT_REPLAY_SPORT_KEY });

    expect(before.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
    expect(explicitNfl).toEqual(before);
  });

  it("defaults to NFL on every entry point, including the low-level builders", () => {
    expect(buildHistoricalOddsInput(preGame()).sport).toBe("americanfootball_nfl");
    expect(DEFAULT_REPLAY_SPORT_KEY).toBe("americanfootball_nfl");
  });

  it("carries a supplied sport key into the scored input", () => {
    expect(buildHistoricalOddsInput(preGame(), { sportKey: "americanfootball_ncaaf" }).sport).toBe(
      "americanfootball_ncaaf",
    );
  });

  it("an empty or whitespace sport key falls back to NFL rather than scoring under ''", () => {
    // A blank string is a caller bug, not a request to score under no sport at all.
    expect(buildHistoricalOddsInput(preGame(), { sportKey: "" }).sport).toBe("americanfootball_nfl");
    expect(buildHistoricalOddsInput(preGame(), { sportKey: "   " }).sport).toBe(
      "americanfootball_nfl",
    );
  });

  it("threads the SAME key to settlement — a tie grades by the replayed sport", () => {
    // The tie is where scoring and settlement disagreeing becomes visible:
    // calculatePickResult grades a draw LOSS for soccer and PUSH for everything else.
    const facts = extractSettlementFacts(heavyMlRow({ homeScore: 24, awayScore: 24, result: 0 }))!;
    const features = assemblePreGameFeatures(
      heavyMlRow({ homeScore: null, awayScore: null, result: null }),
    );
    const ml = scoreHistoricalGame(features).find((p) => p.pickType === "MONEYLINE");
    expect(ml, "fixture must publish a moneyline or this case proves nothing").toBeDefined();

    expect(settleHistoricalPick(ml!, facts, "KC", "DET").result).toBe("PUSH");
    expect(
      settleHistoricalPick(ml!, facts, "KC", "DET", { sportKey: "soccer_usa_mls" }).result,
    ).toBe("LOSS");
  });

  it("the SAME options object reaches scoring and settlement, never one or the other", () => {
    // Guards the drift this parameterisation exists to prevent. A soccer replay
    // must both SCORE and GRADE as soccer; if only settlement got the key, a draw
    // would still grade LOSS but the input would claim NFL.
    const drawn = heavyMlRow({ homeScore: 24, awayScore: 24, result: 0 });
    const features = assemblePreGameFeatures(
      heavyMlRow({ homeScore: null, awayScore: null, result: null }),
    );
    const opts = { sportKey: "soccer_usa_mls" } as const;

    // Scoring side: the key is on the input the frozen model reads.
    expect(buildHistoricalOddsInput(features, opts).sport).toBe("soccer_usa_mls");
    // Settlement side: the same key changes how the tie grades.
    const settled = replayAndSettleGame(drawn, opts);
    const ml = settled.find((p) => p.pickType === "MONEYLINE");
    if (ml) expect(ml.result).toBe("LOSS"); // soccer draw = LOSS, not PUSH
    // And the NFL default on the identical row grades that tie PUSH.
    const asNfl = replayAndSettleGame(drawn).find((p) => p.pickType === "MONEYLINE");
    expect(asNfl, "fixture must publish a moneyline or this case proves nothing").toBeDefined();
    expect(asNfl!.result).toBe("PUSH");
  });

  // NOTE: the scoring-side soccer assertion — that a soccer replay publishes NO
  // moneyline at all — deliberately is NOT here. That suppression lives in
  // `scoreMoneylinePick` on PR #694 (claude/fix-soccer-threeway-moneyline), which
  // is not merged into this branch. Asserting it here would go red for a reason
  // unrelated to this change. Add it to this file once #694 lands; the first draft
  // of this test did assert it and failed exactly that way.
});
