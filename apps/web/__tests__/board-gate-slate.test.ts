import { describe, expect, it } from "vitest";
import {
  GATE_SLATE_INCLUDE,
  isLiveGateSlateEnabled,
  normalizeGateSlatePick,
  partitionGateSlate,
  pricesForPickType,
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

const ODDS: GateSlateOdds = {
  market: "H2H",
  homePrice: -400,
  awayPrice: 320,
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
    isBootstrap: false,
    modelVersion: "v5.1.0",
    signalSnapshot: { eligibleForLearning: true },
    game: {
      sport: { name: "nfl" },
      homeTeam: { name: "Chiefs" },
      awayTeam: { name: "Raiders" },
      odds: [ODDS],
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
  it("a SPREAD pick uses the SPREAD prices, not the moneyline pair", () => {
    const p = pricesForPickType("SPREAD", ODDS);
    expect(p.homePrice).toBe(-110);
    expect(p.awayPrice).toBe(-108);
    // -400 is the outright price. Using it here would claim an ~80% fair
    // probability for a bet that is close to a coin flip.
    expect(p.homePrice).not.toBe(ODDS.homePrice);
  });

  it("a MONEYLINE pick uses the moneyline pair and carries the draw", () => {
    const p = pricesForPickType("MONEYLINE", { ...ODDS, drawPrice: 240 });
    expect(p.homePrice).toBe(-400);
    expect(p.awayPrice).toBe(320);
    expect(p.drawPrice).toBe(240);
  });

  it("never carries a draw price onto a handicap market", () => {
    // A three-way H2H draw price says nothing about a two-way spread.
    expect(pricesForPickType("SPREAD", { ...ODDS, drawPrice: 240 }).drawPrice).toBeNull();
  });

  it("TOTAL yields no home/away pair at all", () => {
    const p = pricesForPickType("TOTAL", ODDS);
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
        pick({ game: { sport: null, homeTeam: { name: "A" }, awayTeam: { name: "B" }, odds: [] } }),
      ),
    ).toBeNull();
    expect(
      normalizeGateSlatePick(
        pick({ game: { sport: { name: "nfl" }, homeTeam: null, awayTeam: { name: "B" }, odds: [] } }),
      ),
    ).toBeNull();
  });

  it("returns null for an unrecognised pickType or result rather than coercing", () => {
    expect(normalizeGateSlatePick(pick({ pickType: "PLAYER_PROP" }))).toBeNull();
    expect(normalizeGateSlatePick(pick({ result: "CANCELLED" }))).toBeNull();
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

  it("takes only the most recent odds row", () => {
    expect(GATE_SLATE_INCLUDE.game.select.odds.take).toBe(1);
    expect(GATE_SLATE_INCLUDE.game.select.odds.orderBy).toEqual({ fetchedAt: "desc" });
  });

  it("selects fetchedAt, not merely orders by it", () => {
    // Which snapshot a q came from is part of whether it can be trusted. A
    // staleness question that cannot be asked later is a claim nobody can check.
    expect(GATE_SLATE_INCLUDE.game.select.odds.select.fetchedAt).toBe(true);
  });
});
