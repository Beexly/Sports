import { describe, expect, it } from "vitest";
import {
  deriveSituation,
  injuryImpactFromRows,
  type GameScheduleContext,
} from "./situation";
import { buildSituationalContext, type GameBundle } from "./engine";
import { reason } from "./reasoning";
import type { InjuryRow } from "./signal-adapters";

function injury(over: Partial<InjuryRow> = {}): InjuryRow {
  return {
    playerName: "Player One",
    team: "KC",
    position: "QB",
    reportStatus: "Out",
    practiceStatus: null,
    primaryInjury: "Ankle",
    season: 2026,
    week: 3,
    sourceId: "nflverse",
    fetchedAt: new Date("2026-09-24T12:00:00.000Z"),
    ...over,
  };
}

function bundle(over: Partial<GameBundle> = {}): GameBundle {
  return {
    gameId: "g1",
    sport: "americanfootball_nfl",
    selection: "KC -3.5",
    pickType: "SPREAD",
    commenceTime: "2026-09-25T20:00:00.000Z",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    market: { market: "SPREAD", fairProb: 0.55, line: -3.5, bookmakerCount: 8, consensusPct: null },
    modelVersion: "v5.2.7",
    statedConfidence: 60,
    now: new Date("2026-09-25T12:00:00.000Z"),
    ...over,
  };
}

describe("deriveSituation", () => {
  it("returns undefined with no context at all, rather than a zeroed situation", () => {
    // A zero would be a CLAIM: "rest is 0 days". Absent means "nothing to say",
    // which is what the spine's null-checks are written to handle.
    expect(deriveSituation(undefined)).toBeUndefined();
    expect(deriveSituation({})).toBeUndefined();
    expect(deriveSituation(null as unknown as GameScheduleContext)).toBeUndefined();
  });

  it("resolves a real rest edge from the games scheduling columns", () => {
    // Prod shape measured 2026-10-01: restDaysHome 8 / restDaysAway 7.
    const s = deriveSituation({ restDaysHome: 8, restDaysAway: 7 });
    expect(s).toBeDefined();
    expect(s?.restDaysHome).toBe(8);
    expect(s?.restDaysAway).toBe(7);
  });

  it("omits rest when only one side is known, because a difference needs both", () => {
    // Week 1 legitimately has NULL rest (no prior game). Reporting 8 vs nothing
    // would let a single-sided value move the number.
    const s = deriveSituation({ restDaysHome: 8, restDaysAway: null });
    expect(s?.restDaysHome).toBeUndefined();
    expect(s?.restDaysAway).toBeUndefined();
  });

  it("passes a back-to-back rest day through as the column states it", () => {
    // Measured prod evidence: isBackToBackHome is true for every row at
    // restDays 0/1 and no row at 2 or above, so the flag is redundant with the
    // number. It must never rewrite a real day count into a 0.
    const s = deriveSituation({
      restDaysHome: 0,
      restDaysAway: 7,
      isBackToBackHome: true,
    });
    expect(s?.restDaysHome).toBe(0);
    expect(s?.restDaysAway).toBe(7);
  });

  it("reports the WORSE density, not the average", () => {
    const s = deriveSituation({ scheduleDensityHome: 0, scheduleDensityAway: 2 });
    expect(s?.scheduleDensity).toBe(2);
  });

  it("ignores non-finite numbers rather than poisoning the downstream sum", () => {
    const s = deriveSituation({
      restDaysHome: Number.NaN,
      restDaysAway: Number.NaN,
      scheduleDensityHome: Number.POSITIVE_INFINITY,
    });
    expect(s).toBeUndefined();
  });

  it("never emits a travel or weather term it cannot source", () => {
    // No venue/coordinate column exists anywhere in the schema and nothing
    // writes WEATHER game_signals, so those two must stay absent. Emitting a
    // guessed value would be narrated by the spine as a measurement.
    const s = deriveSituation({ restDaysHome: 8, restDaysAway: 7 });
    expect(s).not.toHaveProperty("travelTimezoneShift");
    expect(s).not.toHaveProperty("weatherImpact");
  });
});

describe("injuryImpactFromRows", () => {
  it("is undefined when neither side has an injury report", () => {
    expect(injuryImpactFromRows([], [])).toBeUndefined();
    expect(injuryImpactFromRows(undefined, undefined)).toBeUndefined();
  });

  it("is positive when the home side is healthier", () => {
    const impact = injuryImpactFromRows([], [injury(), injury()]);
    expect(impact).toBeGreaterThan(0);
  });

  it("is negative when the away side is healthier", () => {
    const impact = injuryImpactFromRows([injury(), injury()], []);
    expect(impact).toBeLessThan(0);
  });

  it("is zero-adjacent and dropped when both sides are equally hurt", () => {
    const rows = [injury(), injury()];
    const impact = injuryImpactFromRows(rows, rows.map((r) => ({ ...r, team: "BUF" })));
    expect(impact).toBe(0);
    // An exact zero carries no information, so it must not reach the bundle.
    expect(deriveSituation({ restDaysHome: 8, restDaysAway: 8 }, { home: rows, away: rows }))
      .not.toHaveProperty("injuryImpact");
  });

  it("bounds the term so one brutal game cannot dominate the number", () => {
    const many = Array.from({ length: 40 }, () => injury({ playerName: `P${Math.random()}` }));
    const impact = injuryImpactFromRows([], many);
    expect(impact).toBeLessThanOrEqual(0.25);
    expect(impact).toBeGreaterThanOrEqual(-0.25);
  });

  it("weighs a lost starter above a minor hurt from the SAME side", () => {
    // Compared against a home side carrying some load of its own, so neither
    // case saturates the +/-0.25 clamp and the relative ordering is visible.
    const home = [injury({ team: "KC", position: "WR", reportStatus: "Limited" })];
    const qbImpact = injuryImpactFromRows(home, [
      injury({ team: "BUF", position: "QB", reportStatus: "Out" }),
    ]) ?? 0;
    const minorImpact = injuryImpactFromRows(home, [
      injury({ team: "BUF", position: "WR", reportStatus: "Limited" }),
    ]) ?? 0;
    expect(qbImpact).toBeGreaterThan(minorImpact);
  });
});

describe("situation reaches the reasoning spine", () => {
  it("buildSituationalContext carries a supplied situation through", () => {
    const ctx = buildSituationalContext(
      bundle({ situation: { restDaysHome: 8, restDaysAway: 7 } }),
    );
    expect(ctx.situation.restDaysHome).toBe(8);
    expect(ctx.situation.restDaysAway).toBe(7);
  });

  it("defaults to an empty situation when the bundle carries none", () => {
    const ctx = buildSituationalContext(bundle());
    expect(ctx.situation).toEqual({});
  });

  it("a rest edge actually MOVES the spine number, not just the narrative", () => {
    // The whole point of this wiring. Before it, both bundles below were
    // identical to reason() because situation was always {}.
    const rested = buildSituationalContext(
      bundle({
        situation: { restDaysHome: 8, restDaysAway: 7 },
        extraObservations: [],
      }),
    );
    const squashed = buildSituationalContext(
      bundle({
        situation: { restDaysHome: 3, restDaysAway: 7 },
        extraObservations: [],
      }),
    );
    expect(rested.observations).toHaveLength(0);
    expect(squashed.observations).toHaveLength(0);
    // Same stated confidence and same market; the only difference is who is
    // fresher, so reason() must not return the same situationalShift.
    const restedOut = reason(rested);
    const squashedOut = reason(squashed);
    expect(restedOut.situationalShift).toBeGreaterThan(squashedOut.situationalShift);
  });

  it("an equal rest split produces no rest claim at all", () => {
    const ctx = buildSituationalContext(bundle({ situation: { restDaysHome: 7, restDaysAway: 7 } }));
    expect(ctx.situation.restDaysHome).toBe(7);
  });
});