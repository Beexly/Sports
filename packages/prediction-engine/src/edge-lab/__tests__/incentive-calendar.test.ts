/**
 * Tests for the incentive + rule-change calendar covariate (H0 slice #4).
 *
 * Honesty properties verified:
 *  - Rest bonus / playoff implication / roster-move cells only ever carry
 *    an observedAt strictly before the game's decision time (leak-safe).
 *  - A rule change announced AFTER a game's kickoff is NOT served into that
 *    game's feature vector (fail-closed drop).
 *  - Games whose incentives carry no prior rest history are skipped with an
 *    honest denominator counter.
  * - qClose is devigged from closing moneylines.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import { buildIncentiveRows, restDays, type RuleChange } from "../incentive-calendar.js";

const T0 = Date.parse("2021-09-01T17:00:00.000Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

function game(i: number, home: string, away: string, hs: number | null, as: number | null, dayOffset: number): GameRow {
  return {
    sport: "nfl",
    gameId: `t${i}`,
    season: 2021,
    week: i,
    startTime: iso(T0 + dayOffset * DAY),
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as,
    closing: {
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: 1.8,
      moneylineAwayDecimal: 2.1,
    },
  };
}

describe("restDays", () => {
  it("computes days between prior end and kickoff", () => {
    expect(restDays(iso(T0 - 7 * DAY), iso(T0))).toBeCloseTo(7, 6);
  });
  it("returns null for unparseable input", () => {
    expect(restDays("not-a-date", iso(T0))).toBeNull();
    expect(restDays(iso(T0), "also-bad")).toBeNull();
  });
});

describe("buildIncentiveRows — leak safety", () => {
  it("does not serve a rule announced after kickoff into that game's vector", () => {
    const store = new AsOfFeatureStore();
    // Game 1: week 0 (before any rule announcement).
    const g1 = game(1, "A", "B", 24, 20, 0);
    // Rule announced AFTER g1's kickoff — must not leak into g1.
    const ruleOt: RuleChange = {
      observedAt: iso(T0 + 1 * DAY), // announced 1 day after g1 kickoff
      effectiveFrom: iso(T0 + 8 * DAY),
      key: "ot_format",
      value: 1,
    };
    const { rows, skipped } = buildIncentiveRows([g1], store, {
      restBonuses: [{ observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 }],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [ruleOt],
    });
    // g1 has a decision time of T0 - 1h. The rule was announced at T0+1day,
    // which is AFTER g1's decision time -> not served.
    expect(rows.length).toBe(1);
    expect(rows[0]!.features.has("rule:ot_format")).toBe(false);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("serves a rule announced before kickoff into subsequent games only", () => {
    const store = new AsOfFeatureStore();
    // Rule announced a week before any game.
    const ruleChallenge: RuleChange = {
      observedAt: iso(T0 - 7 * DAY),
      effectiveFrom: iso(T0),
      key: "challenge_limit",
      value: 1,
    };
    const g1 = game(1, "A", "B", 24, 20, 0);
    const { rows } = buildIncentiveRows([g1], store, {
      restBonuses: [{ observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 }],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [ruleChallenge],
    });
    expect(rows.length).toBe(1);
    expect(rows[0]!.features.get("rule:challenge_limit")).toBe(1);
  });

  it("fails closed when rest history is absent for both sides", () => {
    const store = new AsOfFeatureStore();
    const g1 = game(1, "A", "B", 24, 20, 0);
    const { rows, skipped } = buildIncentiveRows([g1], store, {
      restBonuses: [],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [],
    });
    expect(rows.length).toBe(0);
    expect(skipped.missingRestHistory).toBe(1);
  });
});

describe("buildIncentiveRows — feature ingestion", () => {
  it("emits rest, playoff implication, and roster-move cells as-of the game", () => {
    const store = new AsOfFeatureStore();
    // Prior game for team A ended 4 days before g1 kickoff.
    const g1 = game(1, "A", "B", 24, 20, 0);
    // Team A rest bonus stamped at prior game end (4 days before).
    const restA = { observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 };
    // Team A playoff implication (elimination-level: 3) also known before g1.
    const pimpA = { observedAt: iso(T0 - 2 * DAY), team: "A", implicationLevel: 3 as const };
    // Team A roster move window known before g1.
    const rmA = { observedAt: iso(T0 - 1 * DAY), team: "A", moveWeight: 0.8 };
    // Team B rest bonus.
    const restB = { observedAt: iso(T0 - 5 * DAY), team: "B", restDays: 5 };

    const { rows } = buildIncentiveRows([g1], store, {
      restBonuses: [restA, restB],
      playoffImplications: [pimpA],
      rosterMoves: [rmA],
      ruleChanges: [],
    });
    expect(rows.length).toBe(1);
    const f = rows[0]!.features;
    expect(f.get("incentive:rest_bonus")).toBeCloseTo(4, 10);
    expect(f.get("incentive:playoff_implication")).toBe(3);
    expect(f.get("incentive:roster_move_window")).toBeCloseTo(0.8, 10);
    expect(f.get("incentive:rest_bonus_away")).toBeCloseTo(5, 10);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("skips games with no odds and counts them honestly", () => {
    const store = new AsOfFeatureStore();
    const gNoOdds: GameRow = {
      ...game(1, "A", "B", 24, 20, 0),
      closing: { spreadHome: null, total: null, moneylineHomeDecimal: null, moneylineAwayDecimal: null },
    };
    const { rows, skipped } = buildIncentiveRows([gNoOdds], store, {
      restBonuses: [{ observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 }],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [],
    });
    expect(rows.length).toBe(0);
    expect(skipped.noOdds).toBe(1);
  });

  it("skips ties with an honest counter", () => {
    const store = new AsOfFeatureStore();
    const tie = game(1, "A", "B", 21, 21, 0);
    const { rows, skipped } = buildIncentiveRows([tie], store, {
      restBonuses: [{ observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 }],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [],
    });
    expect(rows.length).toBe(0);
    expect(skipped.tie).toBe(1);
  });
});

describe("buildIncentiveRows — qClose derivation", () => {
  it("deviggs closing moneylines into qClose in (0,1)", () => {
    const store = new AsOfFeatureStore();
    const g = game(1, "A", "B", 24, 20, 0); // 1.8 vs 2.1 -> qHome = 1.8/3.9
    const { rows } = buildIncentiveRows([g], store, {
      restBonuses: [{ observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 }],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [],
    });
    expect(rows[0]!.qClose).toBeCloseTo(1.8 / 3.9, 10);
    expect(rows[0]!.qClose).toBeGreaterThan(0);
    expect(rows[0]!.qClose).toBeLessThan(1);
  });

  it("sets decisionAt strictly before kickoff by the lead time", () => {
    const store = new AsOfFeatureStore();
    const g = game(1, "A", "B", 24, 20, 0);
    const { rows } = buildIncentiveRows([g], store, {
      restBonuses: [{ observedAt: iso(T0 - 4 * DAY), team: "A", restDays: 4 }],
      playoffImplications: [],
      rosterMoves: [],
      ruleChanges: [],
    });
    const decisionMs = Date.parse(rows[0]!.decisionAt);
    const kickoffMs = Date.parse(g.startTime);
    expect(decisionMs).toBeLessThan(kickoffMs);
    expect(kickoffMs - decisionMs).toBe(60 * 60_000); // 1h lead
  });
});

describe("buildIncentiveRows — store no-lookahead invariant", () => {
  it("passes the as-of store's lookahead tripwire across a multi-game corpus", () => {
    const store = new AsOfFeatureStore();
    const games: GameRow[] = [];
    for (let w = 0; w < 7; w++) {
      games.push(game(w + 1, "A", "B", 24 + w, 20, w * 7));
    }
    const restA = { observedAt: iso(-3 * DAY), team: "A", restDays: 3 };
    const { rows } = buildIncentiveRows(games, store, {
      restBonuses: [restA],
      playoffImplications: [{ observedAt: iso(T0 - 1 * DAY), team: "A", implicationLevel: 2 }],
      rosterMoves: [{ observedAt: iso(T0 - 1 * DAY), team: "B", moveWeight: 0.5 }],
      ruleChanges: [
        { observedAt: iso(T0 - 10 * DAY), effectiveFrom: iso(T0), key: "ot_format", value: 1 },
      ],
    });
    // All served reads must postdate-or-equal their cutoff.
    expect(() => store.assertNoLookahead()).not.toThrow();
    expect(rows.length).toBeGreaterThan(0);
  });
});
