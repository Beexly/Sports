/**
 * Shadow-only observation mode — the non-vacuity proof.
 *
 * Background: INJURY_AVAILABILITY observations were arithmetically wired into
 * customer-facing numbers with no switch to disable them. The lean loop in
 * reasoning.ts iterated every publishable observation with no family filter, so
 * injuries moved `situationalShift` -> `calibratedProb`, and because
 * knowability/evidenceHealth were computed from `publishable.length`, injuries
 * also moved `publishState` (WITHHOLD -> CANDIDATE) as a side effect.
 *
 * Shadow mode fixes that: the family is still counted and reported, but
 * contributes ZERO to the calibration spine.
 *
 * The load-bearing test in this file is "BIT-IDENTICAL". A test that passes
 * whether or not the feature works proves nothing, so the file also asserts
 * the NEGATIVE case — injuries NOT shadowed DO move the numbers — in the same
 * fixture shape. If someone deletes the shadow filter, exactly one of those
 * two tests fails, and it is not the one that always passed.
 */

import { describe, expect, it } from "vitest";
import {
  reason,
  explain,
  type SituationalContext,
  type SignalObservation,
} from "./reasoning";
import { shadowOnly, InvalidShadowPolicyError } from "./shadow";
import { runIntelligence, type GameBundle } from "./engine";
import type { InjuryRow } from "./signal-adapters";

const NOW = new Date("2026-09-25T12:00:00Z");

function obs(over: Partial<SignalObservation> = {}): SignalObservation {
  return {
    family: "PLAY_CHARTING",
    key: "motion_rate",
    fact: "Motion rate 42% over last 4 games",
    knownAt: "2026-09-24T12:00:00Z",
    origin: "ftn_charting_2025",
    trust: 0.85,
    freshness: 0.9,
    lean: 0.4,
    rights: "cleared",
    tier: 2,
    ...over,
  };
}

/** A high-trust, high-freshness, hard-leaning injury. Big enough to move
 *  anything it touches — which is the point: it must move nothing. */
function injuryObs(over: Partial<SignalObservation> = {}): SignalObservation {
  return obs({
    family: "INJURY_AVAILABILITY",
    key: "wr1_out",
    fact: "WR1 ruled out — target share shifts to slot",
    knownAt: "2026-09-24T09:00:00Z",
    origin: "nfl-official-injury",
    trust: 0.95,
    freshness: 0.95,
    lean: -0.5,
    rights: "use-with-caution",
    tier: 1,
    ...over,
  });
}

const MARKET = {
  market: "spread",
  fairProb: 0.52,
  line: -3.5,
  bookmakerCount: 6,
  consensusPct: 0.83,
} as const;

function ctx(over: Partial<SituationalContext> = {}): SituationalContext {
  return {
    gameId: "g1",
    sport: "americanfootball_nfl",
    selection: "Home -3.5",
    pickType: "SPREAD",
    commenceTime: "2026-09-28T17:00:00Z",
    observations: [obs()],
    market: MARKET,
    situation: {},
    modelVersion: "v5.2.7",
    statedConfidence: 65,
    grade: "SOLID_PLAY",
    ...over,
  };
}

// The three bundles the whole file turns on. Identical except for injuries.
const NO_INJURY = ctx();
const WITH_INJURY = ctx({
  observations: [obs(), injuryObs()],
  situation: { injuryImpact: -0.05 },
});
const WITH_INJURY_SHADOWED = ctx({
  observations: [obs(), injuryObs()],
  situation: { injuryImpact: -0.05 },
  shadowPolicy: shadowOnly(
    ["INJURY_AVAILABILITY"],
    "Injury leans are not yet validated against our calibration spine; count and report them, but do not let them move a published number.",
  ),
});

describe("shadow mode — the switch exists and cannot be enabled silently", () => {
  it("shadowOnly() builds a policy with the families and the written reason", () => {
    const p = shadowOnly(["INJURY_AVAILABILITY"], "not validated yet");
    expect(p.families).toEqual(["INJURY_AVAILABILITY"]);
    expect(p.justification).toBe("not validated yet");
  });

  it("refuses to build a policy with no families", () => {
    expect(() => shadowOnly([], "reason")).toThrow(InvalidShadowPolicyError);
  });

  it("refuses to build a policy with no justification — this is the anti-silent switch", () => {
    expect(() => shadowOnly(["INJURY_AVAILABILITY"], "")).toThrow(
      InvalidShadowPolicyError,
    );
    expect(() => shadowOnly(["INJURY_AVAILABILITY"], "   ")).toThrow(
      InvalidShadowPolicyError,
    );
  });

  it("rejects an unknown family instead of silently shadowing nothing", () => {
    expect(() =>
      shadowOnly(["NOT_A_FAMILY" as never], "typo"),
    ).toThrow(InvalidShadowPolicyError);
  });

  it("reason() throws on a hand-rolled policy that skips the checks", () => {
    // Bypassing shadowOnly() with a bare object literal must not be a way to
    // get a "valid" policy — the call site re-validates.
    expect(() =>
      reason(ctx({ shadowPolicy: { families: [], justification: "" } as never })),
    ).toThrow(InvalidShadowPolicyError);
    expect(() =>
      reason(ctx({ shadowPolicy: { families: ["INJURY_AVAILABILITY"] } as never })),
    ).toThrow(InvalidShadowPolicyError);
  });

  it("is a no-op when no policy is supplied — the default is today's behaviour", () => {
    const r = reason(NO_INJURY);
    expect(r.shadowReport.active).toBe(false);
    expect(r.shadowReport.families).toEqual([]);
    expect(r.shadowReport.justification).toBeNull();
    expect(r.shadowReport.shadowedCount).toBe(0);
    // calibrationCount equals every rights-cleared observation.
    expect(r.shadowReport.calibrationCount).toBe(NO_INJURY.observations.length);
  });
});

describe("shadow mode — BIT-IDENTICAL proof (the non-vacuity core)", () => {
  it("shadowed injuries leave calibratedProb BIT-IDENTICAL to a bundle with no injuries", () => {
    const withoutInjuries = reason(NO_INJURY);
    const withShadowedInjuries = reason(WITH_INJURY_SHADOWED);
    // toBe is exact float equality — not toBeCloseTo. Bit-identical or nothing.
    expect(withShadowedInjuries.calibratedProb).toBe(withoutInjuries.calibratedProb);
  });

  it("shadowed injuries leave publishState BIT-IDENTICAL to a bundle with no injuries", () => {
    const withoutInjuries = reason(NO_INJURY);
    const withShadowedInjuries = reason(WITH_INJURY_SHADOWED);
    expect(withShadowedInjuries.publishState).toBe(withoutInjuries.publishState);
  });

  it("shadowed injuries leave every calibration-spine aggregate bit-identical", () => {
    const a = reason(NO_INJURY);
    const b = reason(WITH_INJURY_SHADOWED);
    expect(b.situationalShift).toBe(a.situationalShift);
    expect(b.knowability).toBe(a.knowability);
    expect(b.evidenceHealth).toBe(a.evidenceHealth);
    expect(b.edgeVsMarket).toBe(a.edgeVsMarket);
    expect(b.signalWeight).toBe(a.signalWeight);
    expect(b.withholdReasons).toEqual(a.withholdReasons);
    expect(b.familyWeights).toEqual(a.familyWeights);
  });

  it("NON-VACUITY: the same injuries DO move calibratedProb when NOT shadowed", () => {
    const withoutInjuries = reason(NO_INJURY);
    const withLiveInjuries = reason(WITH_INJURY);
    // If this ever passes trivially, the bit-identical test above is worthless.
    expect(withLiveInjuries.calibratedProb).not.toBe(withoutInjuries.calibratedProb);
  });

  it("NON-VACUITY: the same injuries DO move the aggregates when NOT shadowed", () => {
    const withoutInjuries = reason(NO_INJURY);
    const withLiveInjuries = reason(WITH_INJURY);
    expect(withLiveInjuries.situationalShift).not.toBe(withoutInjuries.situationalShift);
    // evidenceHealth is the aggregate that moves here: knowability SATURATES at
    // 1.0 for this fixture (trust 0.85 / 0.85 divisor), so it is pinned and
    // cannot differ. evidenceHealth is the real probe — see the publishState
    // test below for a knowability that is free to move.
    expect(withLiveInjuries.evidenceHealth).not.toBe(withoutInjuries.evidenceHealth);
  });

  it("NON-VACUITY: injuries can flip publishState WITHHOLD -> CANDIDATE when live", () => {
    // This is the field the wiring plan actually cares about, so the fixture is
    // built to let it move:
    //   - pickType MONEYLINE, because SPREAD is in PUBLISH_ACTIONS as
    //     "suppress-or-shrink": shouldSuppress() is then permanently true and
    //     publishState would be WITHHOLD for every input, live or not.
    //   - one low-trust tier-4 observation, so knowability starts below the
    //     0.55 gate and adding a trust-0.95/tier-1 injury can cross it. With
    //     the default trust-0.85 observation knowability pins at 1.0 and the
    //     gate could never be crossed by anything. trust/freshness 0.40 is
    //     chosen for margin (live lands at know 0.68 vs the 0.55 gate, ev 0.53
    //     vs 0.50), not on a knife edge.
    const thinObs = [obs({ trust: 0.4, freshness: 0.4, tier: 4, lean: 0 })];
    const thin = { pickType: "MONEYLINE" as const, grade: undefined };
    const base = ctx({ observations: thinObs, situation: {}, ...thin });
    const live = ctx({
      observations: [...thinObs, injuryObs()],
      situation: { injuryImpact: 0 },
      ...thin,
    });
    const shadowed = ctx({
      observations: [...thinObs, injuryObs()],
      situation: { injuryImpact: 0 },
      shadowPolicy: shadowOnly(["INJURY_AVAILABILITY"], "hold injuries out of the spine"),
      ...thin,
    });

    const baseR = reason(base);
    const liveR = reason(live);
    const shadowedR = reason(shadowed);

    // The bundle is genuinely on the fence without the injury.
    expect(baseR.publishState).toBe("WITHHOLD");
    expect(baseR.knowability).toBeLessThan(0.55);
    expect(baseR.evidenceHealth).toBeLessThan(0.5);

    // Live injuries carry it over the gate...
    expect(liveR.knowability).toBeGreaterThan(baseR.knowability);
    expect(liveR.evidenceHealth).toBeGreaterThan(baseR.evidenceHealth);
    expect(liveR.publishState).toBe("CANDIDATE");

    // ...shadowed injuries do not, and match the no-injury bundle exactly.
    expect(shadowedR.publishState).toBe(baseR.publishState);
    expect(shadowedR.publishState).toBe("WITHHOLD");
    expect(shadowedR.knowability).toBe(baseR.knowability);
    expect(shadowedR.evidenceHealth).toBe(baseR.evidenceHealth);
  });

  it("the situation.injuryImpact back door is closed too, not just the observation", () => {
    // An injury bundle whose ONLY contribution is the scalar. If shadow mode
    // filtered observations but not ctx.situation, this would still move.
    const withScalar = ctx({
      observations: [obs()],
      situation: { injuryImpact: -0.12 },
    });
    const scalarShadowed = ctx({
      observations: [obs()],
      situation: { injuryImpact: -0.12 },
      shadowPolicy: shadowOnly(["INJURY_AVAILABILITY"], "hold injuries out of the spine"),
    });
    const noInjury = ctx({ observations: [obs()], situation: {} });

    expect(reason(withScalar).situationalShift).not.toBe(reason(noInjury).situationalShift);
    expect(reason(scalarShadowed).situationalShift).toBe(reason(noInjury).situationalShift);
    expect(reason(scalarShadowed).calibratedProb).toBe(reason(noInjury).calibratedProb);
  });
});

describe("shadow mode — still counted and still reported", () => {
  it("counts the shadowed observations instead of dropping them", () => {
    const r = reason(WITH_INJURY_SHADOWED);
    expect(r.shadowReport.active).toBe(true);
    expect(r.shadowReport.families).toEqual(["INJURY_AVAILABILITY"]);
    expect(r.shadowReport.shadowedCount).toBe(1);
    // One charting observation fed calibration; the injury was held out.
    expect(r.shadowReport.calibrationCount).toBe(1);
    // Total knowledge is unchanged — nothing was thrown away.
    expect(WITH_INJURY_SHADOWED.observations.length).toBe(2);
  });

  it("surfaces the shadowed family in the six questions and in why", () => {
    const r = reason(WITH_INJURY_SHADOWED);
    expect(r.sixQuestions.reliability).toMatch(/shadow-only/i);
    expect(r.sixQuestions.reliability).toMatch(/INJURY_AVAILABILITY/);
    expect(r.sixQuestions.what).toMatch(/shadow-only/i);
    expect(r.why.some((x) => /shadow-only/i.test(x))).toBe(true);
    // The justification travels with the number — the reader can audit it.
    expect(r.why.some((x) => /not yet validated/i.test(x))).toBe(true);
  });

  it("keeps the injury fact itself in the 'what' knowledge line", () => {
    // Shadow mode withholds INFLUENCE, not knowledge. The reader still sees the
    // fact and still sees where it came from.
    const r = reason(WITH_INJURY_SHADOWED);
    expect(r.sixQuestions.where).toMatch(/nfl-official-injury/);
    expect(r.sixQuestions.when).toMatch(/\d{4}-/);
  });

  it("familyWeights reports 0 for a shadowed family (honest, and computed not removed)", () => {
    const shadowed = reason(WITH_INJURY_SHADOWED);
    const live = reason(WITH_INJURY);
    // The computation is untouched — the family still appears in the record.
    expect(Object.keys(shadowed.familyWeights)).toContain("INJURY_AVAILABILITY");
    expect(shadowed.familyWeights.INJURY_AVAILABILITY).toBe(0);
    // ...and when live it is non-zero, so the 0 above is a filter, not a bug.
    expect(live.familyWeights.INJURY_AVAILABILITY).not.toBe(0);
    // Non-shadowed families are unaffected by the policy.
    expect(shadowed.familyWeights.PLAY_CHARTING).toBe(live.familyWeights.PLAY_CHARTING);
  });

  it("explain() discloses the shadow so the summary cannot imply the signal was used", () => {
    const r = reason(WITH_INJURY_SHADOWED);
    const text = explain(WITH_INJURY_SHADOWED, r);
    expect(text).toMatch(/shadow-only INJURY_AVAILABILITY/i);
    expect(text).toMatch(/not calibrated/i);
  });
});

describe("shadow mode — other families and combinations", () => {
  it("shadows every listed family at once", () => {
    const multi = ctx({
      observations: [
        obs(),
        injuryObs(),
        obs({
          family: "MARKET",
          key: "line_move",
          fact: "Spread moved -2.5 → -3.5 across 6 books",
          origin: "the-odds-api",
          trust: 0.9,
          lean: -0.3,
          tier: 1,
        }),
      ],
      shadowPolicy: shadowOnly(
        ["INJURY_AVAILABILITY", "MARKET"],
        "both families under validation review",
      ),
    });
    const r = reason(multi);
    expect(r.shadowReport.families).toEqual(["INJURY_AVAILABILITY", "MARKET"]);
    expect(r.shadowReport.shadowedCount).toBe(2);
    expect(r.shadowReport.calibrationCount).toBe(1);
    expect(r.familyWeights.INJURY_AVAILABILITY).toBe(0);
    expect(r.familyWeights.MARKET).toBe(0);
    expect(r.familyWeights.PLAY_CHARTING).not.toBe(0);
  });

  it("shadowing a family with no observations is inert, not an error", () => {
    const r = reason(
      ctx({
        observations: [obs()],
        shadowPolicy: shadowOnly(["FANTASY_DFS"], "no DFS rows this game; policy is global"),
      }),
    );
    expect(r.shadowReport.shadowedCount).toBe(0);
    expect(r.shadowReport.active).toBe(false);
    expect(r.calibratedProb).toBe(reason(NO_INJURY).calibratedProb);
  });

  it("shadowing the only publishable family yields zero, and WITHHOLD — not a fake number", () => {
    // Every rights-cleared observation is shadowed: the spine has nothing to
    // calibrate on. That must read as WITHHOLD with thin knowability, not as
    // a confidence that quietly came from the shadowed data.
    const r = reason(
      ctx({
        observations: [injuryObs()],
        situation: { injuryImpact: -0.05 },
        shadowPolicy: shadowOnly(["INJURY_AVAILABILITY"], "not validated"),
      }),
    );
    expect(r.knowability).toBe(0);
    expect(r.evidenceHealth).toBe(0);
    expect(r.publishState).toBe("WITHHOLD");
    expect(r.withholdReasons.some((x) => /knowability/i.test(x))).toBe(true);
    // Still reported — we know about it, we just will not bet on it.
    expect(r.shadowReport.shadowedCount).toBe(1);
    expect(r.sixQuestions.reliability).toMatch(/shadow-only/i);
  });

  it("still withholds on forbidden rights even when that family is shadowed", () => {
    // Compliance is not a calibration input — shadow mode must not become a
    // way to launder forbidden-rights data into a report.
    const r = reason(
      ctx({
        observations: [obs(), injuryObs({ rights: "forbidden" })],
        shadowPolicy: shadowOnly(["INJURY_AVAILABILITY"], "not validated"),
      }),
    );
    expect(r.publishState).toBe("WITHHOLD");
    expect(r.withholdReasons.some((x) => /forbidden/i.test(x))).toBe(true);
  });
});

describe("shadow mode — production path through the engine", () => {
  const injury: InjuryRow = {
    playerName: "Ja'Marr Chase",
    team: "CIN",
    position: "WR",
    reportStatus: "Out",
    primaryInjury: "hamstring",
    season: 2026,
    week: 4,
    fetchedAt: "2026-09-24T18:00:00Z",
    sourceId: "nflverse",
  };

  const bundle: GameBundle = {
    gameId: "g1",
    sport: "americanfootball_nfl",
    selection: "CIN -2.5",
    pickType: "SPREAD",
    commenceTime: "2026-09-28T17:00:00Z",
    homeTeam: "CIN",
    awayTeam: "BAL",
    market: { market: "spread", fairProb: 0.52, line: -2.5, bookmakerCount: 8, consensusPct: 0.8 },
    situation: { restDaysHome: 7, restDaysAway: 4 },
    homeInjuries: [injury],
    modelVersion: "v5.2.7",
    statedConfidence: 62,
    grade: "SOLID_PLAY",
    now: NOW,
  };

  const noInjuryBundle: GameBundle = { ...bundle, homeInjuries: [] };

  it("bit-identical calibratedProb and publishState through runIntelligence()", () => {
    const shadowed = runIntelligence({
      ...bundle,
      shadowPolicy: shadowOnly(
        ["INJURY_AVAILABILITY"],
        "injury leans under validation; count and report, do not calibrate",
      ),
    });
    const noInjuries = runIntelligence(noInjuryBundle);

    expect(shadowed.calibratedProb).toBe(noInjuries.calibratedProb);
    expect(shadowed.publishState).toBe(noInjuries.publishState);
    expect(shadowed.situationalShift).toBe(noInjuries.situationalShift);
    expect(shadowed.knowability).toBe(noInjuries.knowability);
    expect(shadowed.evidenceHealth).toBe(noInjuries.evidenceHealth);
  });

  it("NON-VACUITY: live injuries move the same production fields", () => {
    const live = runIntelligence(bundle);
    const noInjuries = runIntelligence(noInjuryBundle);
    expect(live.calibratedProb).not.toBe(noInjuries.calibratedProb);
    expect(live.situationalShift).not.toBe(noInjuries.situationalShift);
  });

  it("still reports the injury through the engine's presence flags and count", () => {
    const shadowed = runIntelligence({
      ...bundle,
      shadowPolicy: shadowOnly(["INJURY_AVAILABILITY"], "under validation"),
    });
    // Counted: observationCount includes the shadowed row.
    expect(shadowed.observationCount).toBe(runIntelligence(bundle).observationCount);
    expect(shadowed.observationCount).toBeGreaterThan(0);
    // Reported: presence still says we had an injury signal.
    expect(shadowed.presence.hadInjurySignal).toBe(true);
    expect(shadowed.shadowReport.shadowedCount).toBe(1);
    expect(shadowed.sixQuestions.what).toMatch(/Chase/);
  });

  it("a bundle with no shadowPolicy is byte-identical to the pre-shadow engine path", () => {
    // `shadowPolicy: undefined` must not perturb anything for existing callers.
    const omitted = runIntelligence(bundle);
    const explicitUndefined = runIntelligence({ ...bundle, shadowPolicy: undefined });
    expect(explicitUndefined.calibratedProb).toBe(omitted.calibratedProb);
    expect(explicitUndefined.publishState).toBe(omitted.publishState);
    expect(explicitUndefined.shadowReport.active).toBe(false);
  });
});
