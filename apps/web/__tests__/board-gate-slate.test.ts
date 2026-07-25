import { describe, expect, it } from "vitest";
import {
  GATE_SLATE_INCLUDE,
  isLiveGateSlateEnabled,
  normalizeGateSlatePick,
  partitionGateSlate,
  pricesForPickType,
  selectOddsForPick,
  type GateSlateOdds,
  type GateSlatePick,
} from "@/lib/board/load-gate-slate";
import {
  buildCalibrationRows,
  isLearningAdmissible,
  PRODUCTION_CALIBRATION_OPTS,
  stratumOf,
  type RawPickRow,
} from "@/lib/board/gate-rows";

/**
 * The production join. Two classes of failure are tested:
 *
 *  1. Reading the WRONG PRICE. `Odds` keeps moneyline prices in home/awayPrice
 *     and spread prices in home/awaySpreadPrice. De-vigging a spread pick
 *     against the moneyline pair yields the fair probability of a different
 *     bet — plausible, undetectable downstream, and wrong.
 *  2. Inventing PROVENANCE. A pick with no snapshot must never be treated as
 *     learning-eligible, because that admits history the product has already
 *     declared untrustworthy into the bar it claims to have cleared.
 */

const NOW = new Date("2026-07-25T00:00:00Z");
const FRESH = new Date("2026-07-24T23:00:00Z");

const H2H: GateSlateOdds = {
  market: "H2H",
  fetchedAt: FRESH,
  spread: null,
  homePrice: -400,
  awayPrice: 320,
  drawPrice: null,
  homeSpreadPrice: null,
  awaySpreadPrice: null,
};

const SPREADS: GateSlateOdds = {
  market: "SPREADS",
  fetchedAt: FRESH,
  spread: -3.5,
  homePrice: null,
  awayPrice: null,
  drawPrice: null,
  homeSpreadPrice: -110,
  awaySpreadPrice: -108,
};

function pick(over: Partial<GateSlatePick> = {}): GateSlatePick {
  return {
    id: "pick-1",
    selection: "Chiefs -3.5",
    confidence: 72,
    pickType: "SPREAD",
    result: "WIN",
    line: -3.5,
    isBootstrap: false,
    modelVersion: "v5.1.0",
    signalSnapshot: { eligibleForLearning: true },
    game: {
      sport: { name: "nfl" },
      homeTeamName: "Chiefs",
      awayTeamName: "Raiders",
      commenceTime: new Date("2026-07-26T00:00:00Z"),
      status: "SCHEDULED",
      odds: [H2H, SPREADS],
    },
    ...over,
  };
}

describe("isLiveGateSlateEnabled — off unless explicitly on", () => {
  it('is true only for exactly "1"', () => {
    expect(isLiveGateSlateEnabled({ LIVE_BOARD_GATE_SLATE: "1" })).toBe(true);
  });

  it("is false when absent — the default is off", () => {
    expect(isLiveGateSlateEnabled({})).toBe(false);
  });

  it('is false for "0", "false", and "true"', () => {
    // No truthy-string coercion: a public surface must not switch on because
    // someone wrote LIVE_BOARD_GATE_SLATE=false.
    expect(isLiveGateSlateEnabled({ LIVE_BOARD_GATE_SLATE: "0" })).toBe(false);
    expect(isLiveGateSlateEnabled({ LIVE_BOARD_GATE_SLATE: "false" })).toBe(false);
    expect(isLiveGateSlateEnabled({ LIVE_BOARD_GATE_SLATE: "true" })).toBe(false);
  });
});

describe("pricesForPickType — the right market's prices, or none", () => {
  it("a SPREAD pick uses the SPREAD prices", () => {
    const p = pricesForPickType("SPREAD", SPREADS);
    expect(p.homePrice).toBe(-110);
    expect(p.awayPrice).toBe(-108);
  });

  it("a MONEYLINE pick uses the moneyline pair and carries the draw", () => {
    const p = pricesForPickType("MONEYLINE", { ...H2H, drawPrice: 240 });
    expect(p.homePrice).toBe(-400);
    expect(p.awayPrice).toBe(320);
    expect(p.drawPrice).toBe(240);
  });

  it("never carries a draw price onto a handicap market", () => {
    // A three-way H2H draw price says nothing about a two-way spread.
    expect(pricesForPickType("SPREAD", { ...SPREADS, drawPrice: 240 }).drawPrice).toBeNull();
  });

  it("TOTAL yields no home/away pair at all", () => {
    const p = pricesForPickType("TOTAL", H2H);
    expect(p).toEqual({ homePrice: null, awayPrice: null, drawPrice: null });
  });

  it("absent odds yield nulls rather than a guess", () => {
    expect(pricesForPickType("SPREAD", undefined)).toEqual({
      homePrice: null,
      awayPrice: null,
      drawPrice: null,
    });
  });
});

describe("normalizeGateSlatePick — carries provenance, never invents it", () => {
  it("maps a complete pick and preserves all three provenance fields", () => {
    const row = normalizeGateSlatePick(pick())!;
    expect(row.isBootstrap).toBe(false);
    expect(row.eligibleForLearning).toBe(true);
    expect(row.modelVersion).toBe("v5.1.0");
    expect(row.homePrice).toBe(-110); // spread price, per the pick type
  });

  it("leaves eligibleForLearning UNDEFINED when there is no snapshot", () => {
    // Not false, not true — unproven. The distinction is what makes the
    // fail-closed rule meaningful.
    const row = normalizeGateSlatePick(pick({ signalSnapshot: null }))!;
    expect(row.eligibleForLearning).toBeUndefined();
    expect(isLearningAdmissible(row)).toBe(false);
  });

  it("returns null when the sport or a team cannot be named", () => {
    expect(
      normalizeGateSlatePick(
        pick({ game: { sport: null, homeTeamName: "A", awayTeamName: "B", odds: [] } }),
      ),
    ).toBeNull();
    expect(
      normalizeGateSlatePick(
        pick({ game: { sport: { name: "nfl" }, homeTeamName: null, awayTeamName: "B", odds: [] } }),
      ),
    ).toBeNull();
  });

  it("returns null for an unrecognised pickType or result rather than coercing", () => {
    expect(normalizeGateSlatePick(pick({ pickType: "PLAYER_PROP" }))).toBeNull();
    expect(normalizeGateSlatePick(pick({ result: "CANCELLED" }))).toBeNull();
  });
});

describe("the production join — five defects review found, pinned", () => {
  it("reads the DENORMALIZED team names, not the optional relations", () => {
    // process-sport.ts writes homeTeamName/awayTeamName and never assigns
    // homeTeamId/awayTeamId, so the homeTeam/awayTeam relations are null for
    // every ingested game. Selecting them made the entire live slate
    // undescribable — an enabled flag would have rendered an empty board.
    const row = normalizeGateSlatePick(pick())!;
    expect(row.homeTeamName).toBe("Chiefs");
    expect(row.awayTeamName).toBe("Raiders");
  });

  it("picks the odds row for the pick's OWN market, not the newest of any market", () => {
    // One Odds row per (game, bookmaker, market), and same-cycle rows share
    // fetchedAt — so take-the-newest returns an arbitrary market. A SPREAD pick
    // handed an H2H row sees null spread prices and is excluded for want of a
    // field that was never on that row.
    expect(selectOddsForPick("SPREAD", [H2H, SPREADS])!.market).toBe("SPREADS");
    expect(selectOddsForPick("SPREAD", [SPREADS, H2H])!.market).toBe("SPREADS");
    expect(selectOddsForPick("MONEYLINE", [SPREADS, H2H])!.market).toBe("H2H");
    expect(selectOddsForPick("SPREAD", [H2H])).toBeUndefined();
  });

  it("prefers the freshest row WITHIN the matched market", () => {
    const older: GateSlateOdds = {
      ...SPREADS,
      homeSpreadPrice: -200,
      fetchedAt: new Date("2026-07-20T00:00:00Z"),
    };
    // Rows arrive newest-first, so the first market match is the freshest.
    expect(selectOddsForPick("SPREAD", [SPREADS, older])!.homeSpreadPrice).toBe(-110);
  });

  it("refuses a candidate whose latest quote is stale", () => {
    // STALE_DATA is already a first-class No-Bet factor in the engine. Retained
    // rows never expire on their own, so without this a pick could fire against
    // a line from days ago.
    const stale = { ...SPREADS, fetchedAt: new Date("2026-07-01T00:00:00Z") };
    const row = normalizeGateSlatePick(
      pick({ result: "PENDING", game: { ...pick().game!, odds: [stale] } }),
      { liveCandidate: true, now: NOW },
    )!;
    expect(row.inputProblems!.join(" ")).toContain("stale");
  });

  it("refuses a spread candidate whose quoted handicap moved off the pick's line", () => {
    // Pick.line and Odds.spread are both home-perspective, so this compares
    // like with like. A -3.5 pick priced off a -6.5 quote gets a materially
    // wrong edge and nothing downstream could tell.
    const moved = { ...SPREADS, spread: -6.5 };
    const row = normalizeGateSlatePick(
      pick({ result: "PENDING", line: -3.5, game: { ...pick().game!, odds: [moved] } }),
      { liveCandidate: true, now: NOW },
    )!;
    expect(row.inputProblems!.join(" ")).toContain("matching handicap");
  });

  it("refuses a candidate whose game has already started", () => {
    // Settlement lags, so PENDING outlives kickoff. Enforced in the normalizer
    // as well as the SQL where-clause: the query filter is an optimization, this
    // is the guarantee, because a caller using partitionGateSlate directly would
    // otherwise get no protection — and it makes the drop measurable.
    const row = normalizeGateSlatePick(
      pick({
        result: "PENDING",
        game: { ...pick().game!, commenceTime: new Date("2026-07-24T00:00:00Z") },
      }),
      { liveCandidate: true, now: NOW },
    )!;
    expect(row.inputProblems!.join(" ")).toContain("placeable window");
  });

  it("refuses a POSTPONED or CANCELED game even with a future kickoff", () => {
    // The time check alone is not enough: a postponed game keeps a future
    // commenceTime, and it is not a placeable wager either. The candidate query
    // filters status in SQL; the normalizer must not apply a weaker rule.
    for (const status of ["POSTPONED", "CANCELED", "LIVE", "FINAL"]) {
      const row = normalizeGateSlatePick(
        pick({ result: "PENDING", game: { ...pick().game!, status } }),
        { liveCandidate: true, now: NOW },
      )!;
      expect(row.inputProblems!.join(" ")).toContain(`status is ${status}`);
    }
  });

  it("accepts a SCHEDULED game without a status complaint", () => {
    const row = normalizeGateSlatePick(pick({ result: "PENDING" }), {
      liveCandidate: true,
      now: NOW,
    })!;
    expect(row.inputProblems).toBeUndefined();
  });

  it("does not apply the status rule to settled history", () => {
    // Every settled pick's game is FINAL. Applying it there would exclude all
    // of calibration.
    const row = normalizeGateSlatePick(
      pick({ result: "WIN", game: { ...pick().game!, status: "FINAL" } }),
      { now: NOW },
    )!;
    expect(row.inputProblems).toBeUndefined();
  });

  it("does not apply the kickoff rule to settled history", () => {
    // Every settled pick's game has started. Applying it there would exclude
    // all of calibration.
    const row = normalizeGateSlatePick(
      pick({
        result: "WIN",
        game: { ...pick().game!, commenceTime: new Date("2026-07-24T00:00:00Z") },
      }),
      { now: NOW },
    )!;
    expect(row.inputProblems).toBeUndefined();
  });

  it("accepts a fresh candidate whose handicap still matches", () => {
    const row = normalizeGateSlatePick(pick({ result: "PENDING" }), {
      liveCandidate: true,
      now: NOW,
    })!;
    expect(row.inputProblems).toBeUndefined();
  });

  it("does NOT apply freshness or handicap checks to settled calibration rows", () => {
    // A settled pick's game is over, so its historical quote is exactly the one
    // we want; calling it "stale" would discard real history.
    const ancient = {
      ...SPREADS,
      fetchedAt: new Date("2020-01-01T00:00:00Z"),
      spread: -9.5,
    };
    const row = normalizeGateSlatePick(
      pick({ result: "WIN", game: { ...pick().game!, odds: [ancient] } }),
      { now: NOW },
    )!;
    expect(row.inputProblems).toBeUndefined();
  });

  it("surfaces an input problem as a NAMED exclusion, not a fake missing price", () => {
    const stale = { ...SPREADS, fetchedAt: new Date("2026-07-01T00:00:00Z") };
    const part = partitionGateSlate(
      [pick({ id: "p1", result: "PENDING", game: { ...pick().game!, odds: [stale] } })],
      { now: NOW },
    );
    expect(part.candidates.rows).toHaveLength(0);
    expect(part.candidates.excluded[0]!.missing.join(" ")).toContain("stale");
  });

  it("partition applies the live checks only to PENDING rows", () => {
    const stale = { ...SPREADS, fetchedAt: new Date("2026-07-01T00:00:00Z") };
    const part = partitionGateSlate(
      [
        pick({ id: "settled", result: "WIN", game: { ...pick().game!, odds: [stale] } }),
        pick({ id: "pending", result: "PENDING", game: { ...pick().game!, odds: [stale] } }),
      ],
      { now: NOW },
    );
    expect(part.calibration.rows.map((r) => r.rowId)).toEqual(["settled"]);
    expect(part.candidates.rows).toHaveLength(0);
  });
});

describe("GATE_SLATE_INCLUDE — candidate query shape", () => {
  it("selects the denormalized names and both game gating fields", () => {
    const g = GATE_SLATE_INCLUDE.game.select;
    expect(g.homeTeamName).toBe(true);
    expect(g.awayTeamName).toBe(true);
    // Needed to exclude games that already kicked off; settlement lags, so
    // PENDING outlives kickoff and a FIRE there is unobtainable.
    expect(g.commenceTime).toBe(true);
    expect(g.status).toBe(true);
  });

  it("selects the quoted spread so the handicap can be compared", () => {
    expect(GATE_SLATE_INCLUDE.game.select.odds.select.spread).toBe(true);
  });

  it("pulls a WINDOW of odds rows, not a single one", () => {
    expect(GATE_SLATE_INCLUDE.game.select.odds.take).toBeGreaterThan(1);
  });
});

describe("stratumOf — model version separates calibration", () => {
  it("includes the model version when present", () => {
    expect(stratumOf(normalizeGateSlatePick(pick())!)).toBe("nfl|SPREAD|v5.1.0");
  });

  it("omits it when absent, so existing callers are unchanged", () => {
    const bare: RawPickRow = {
      id: "x",
      selection: "Chiefs -3.5",
      confidence: 70,
      pickType: "SPREAD",
      result: "WIN",
      sportName: "nfl",
      homeTeamName: "Chiefs",
      awayTeamName: "Raiders",
      homePrice: -110,
      awayPrice: -110,
    };
    expect(stratumOf(bare)).toBe("nfl|SPREAD");
  });

  it("does NOT pool two model versions into one stratum", () => {
    const a = normalizeGateSlatePick(pick({ modelVersion: "v5.1.0" }))!;
    const b = normalizeGateSlatePick(pick({ modelVersion: "v6.0.0" }))!;
    expect(stratumOf(a)).not.toBe(stratumOf(b));
  });
});

describe("strict calibration — fails closed on provenance", () => {
  const settled = (over: Partial<GateSlatePick>): RawPickRow =>
    normalizeGateSlatePick(pick({ result: "WIN", ...over }))!;

  it("admits a pick that proves both facts", () => {
    const { rows } = buildCalibrationRows(
      [settled({ isBootstrap: false, signalSnapshot: { eligibleForLearning: true } })],
      PRODUCTION_CALIBRATION_OPTS,
    );
    expect(rows).toHaveLength(1);
  });

  it("excludes a bootstrap pick and names why", () => {
    const { rows, excluded } = buildCalibrationRows(
      [settled({ isBootstrap: true })],
      PRODUCTION_CALIBRATION_OPTS,
    );
    expect(rows).toHaveLength(0);
    expect(excluded[0]!.missing.join(" ")).toContain("bootstrap");
  });

  it("excludes a pick whose snapshot is missing", () => {
    const { rows, excluded } = buildCalibrationRows(
      [settled({ signalSnapshot: null })],
      PRODUCTION_CALIBRATION_OPTS,
    );
    expect(rows).toHaveLength(0);
    expect(excluded[0]!.missing.join(" ")).toContain("unproven");
  });

  it("excludes a pick settlement declined to mark eligible", () => {
    const { rows } = buildCalibrationRows(
      [settled({ signalSnapshot: { eligibleForLearning: false } })],
      PRODUCTION_CALIBRATION_OPTS,
    );
    expect(rows).toHaveLength(0);
  });

  it("excludes a row whose model version is the empty string", () => {
    // Pick.modelVersion is a required column, so it is always PRESENT — but it
    // can be "". stratumOf treats empty as absent and falls back to the
    // two-part key, so without requireModelVersion a batch of blank-version
    // rows would pool into one stratum and calibrate across incomparable score
    // semantics, invisibly. This is the guard for that.
    const { rows, excluded } = buildCalibrationRows(
      [settled({ modelVersion: "" })],
      PRODUCTION_CALIBRATION_OPTS,
    );
    expect(rows).toHaveLength(0);
    expect(excluded[0]!.missing.join(" ")).toContain("no model version");
  });

  it("reports BOTH provenance failures when a row fails on both counts", () => {
    const { excluded } = buildCalibrationRows(
      [settled({ isBootstrap: true, modelVersion: "" })],
      PRODUCTION_CALIBRATION_OPTS,
    );
    expect(excluded[0]!.missing.length).toBeGreaterThan(1);
  });

  it("requireModelVersion alone does not imply the eligibility check", () => {
    // The two strictness dials are independent, so a caller can reason about
    // each one rather than inheriting a bundle.
    const { rows } = buildCalibrationRows([settled({ signalSnapshot: null })], {
      requireModelVersion: true,
    });
    expect(rows).toHaveLength(1);
  });

  it("WITHOUT the strict option, provenance is not required", () => {
    // The illustrative page supplies rows that have no provenance to read.
    // Strictness is opt-in so that surface keeps working unchanged.
    const { rows } = buildCalibrationRows([settled({ signalSnapshot: null })]);
    expect(rows).toHaveLength(1);
  });
});

describe("partitionGateSlate", () => {
  it("routes settled to strict calibration and pending to candidates", () => {
    const part = partitionGateSlate([
      pick({ id: "s1", result: "WIN" }),
      pick({ id: "s2", result: "LOSS" }),
      pick({ id: "p1", result: "PENDING" }),
    ]);
    expect(part.calibration.rows.map((r) => r.rowId)).toEqual(["s1", "s2"]);
    expect(part.candidates.rows.map((r) => r.rowId)).toEqual(["p1"]);
  });

  it("does not require provenance of a PENDING candidate", () => {
    // Nothing is learned from a candidate — it is the thing being judged.
    const part = partitionGateSlate([
      pick({ id: "p1", result: "PENDING", isBootstrap: true, signalSnapshot: null }),
    ]);
    expect(part.candidates.rows.map((r) => r.rowId)).toEqual(["p1"]);
  });

  it("counts undescribable rows instead of silently dropping them", () => {
    const part = partitionGateSlate([pick(), pick({ id: "bad", game: null })]);
    expect(part.undescribable).toBe(1);
  });

  it("excludes ineligible settled history from calibration entirely", () => {
    const part = partitionGateSlate([
      pick({ id: "boot", result: "WIN", isBootstrap: true }),
      pick({ id: "nosnap", result: "LOSS", signalSnapshot: null }),
    ]);
    expect(part.calibration.rows).toHaveLength(0);
    expect(part.calibration.excluded).toHaveLength(2);
  });
});

describe("GATE_SLATE_INCLUDE", () => {
  it("selects the provenance and both price pairs the normalizer reads", () => {
    const odds = GATE_SLATE_INCLUDE.game.select.odds.select;
    expect(odds.homePrice).toBe(true);
    expect(odds.awayPrice).toBe(true);
    expect(odds.homeSpreadPrice).toBe(true);
    expect(odds.awaySpreadPrice).toBe(true);
    expect(odds.drawPrice).toBe(true);
    expect(GATE_SLATE_INCLUDE.signalSnapshot.select.eligibleForLearning).toBe(true);
  });

  it("orders odds newest-first, so the first market match is the freshest", () => {
    // This test previously asserted `take: 1`, which was the defect itself —
    // one row across all markets. The window plus a market filter replaced it.
    expect(GATE_SLATE_INCLUDE.game.select.odds.orderBy).toEqual({ fetchedAt: "desc" });
  });

  it("selects fetchedAt, not merely orders by it", () => {
    // Which snapshot a q came from is part of whether it can be trusted. A
    // staleness question that cannot be asked later is a claim nobody can check.
    expect(GATE_SLATE_INCLUDE.game.select.odds.select.fetchedAt).toBe(true);
  });
});
