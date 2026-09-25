import { describe, expect, it } from "vitest";
import {
  reason,
  explain,
  type SituationalContext,
  type SignalObservation,
} from "./reasoning";

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

function ctx(over: Partial<SituationalContext> = {}): SituationalContext {
  return {
    gameId: "g1",
    sport: "americanfootball_nfl",
    selection: "Home -3.5",
    pickType: "SPREAD",
    commenceTime: "2026-09-28T17:00:00Z",
    observations: [
      obs(),
      obs({
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
      }),
      obs({
        family: "MARKET",
        key: "line_move",
        fact: "Spread moved -2.5 → -3.5 across 6 books",
        knownAt: "2026-09-24T15:00:00Z",
        origin: "the-odds-api",
        trust: 0.9,
        freshness: 0.85,
        lean: -0.3,
        rights: "licensed",
        tier: 1,
      }),
    ],
    market: {
      market: "spread",
      fairProb: 0.52,
      line: -3.5,
      bookmakerCount: 6,
      consensusPct: 0.83,
    },
    situation: {
      restDaysHome: 7,
      restDaysAway: 4,
      travelTimezoneShift: -2,
      weatherImpact: 0.02,
      injuryImpact: -0.05,
      scheduleDensity: 0.3,
    },
    modelVersion: "v5.2.7",
    statedConfidence: 65,
    grade: "SOLID_PLAY",
    ...over,
  };
}

describe("intelligence-core reasoning spine", () => {
  it("answers the six questions and never returns raw stated confidence as P", () => {
    const r = reason(ctx());
    // stated 65 must NOT equal calibrated (empirical bin is ~0.56, plus situational)
    expect(r.calibratedProb).not.toBe(0.65);
    expect(r.calibratedProb).toBeGreaterThan(0.3);
    expect(r.calibratedProb).toBeLessThan(0.85);
    expect(r.sixQuestions.what.length).toBeGreaterThan(5);
    expect(r.sixQuestions.when).toMatch(/\d{4}-/);
    expect(r.sixQuestions.where.length).toBeGreaterThan(2);
    expect(r.sixQuestions.reliability).toMatch(/trust/);
    expect(r.sixQuestions.marketBelieves).toMatch(/Market/);
    expect(r.sixQuestions.improvesDecisions).toMatch(/edge|shift/i);
  });

  it("weights situational context (rest, travel, injuries) into the shift", () => {
    // Isolate rest: same observations, only rest days differ.
    const baseObs = [obs({ lean: 0 })];
    const rested = reason(
      ctx({
        observations: baseObs,
        situation: { restDaysHome: 9, restDaysAway: 3 },
      }),
    );
    const tired = reason(
      ctx({
        observations: baseObs,
        situation: { restDaysHome: 3, restDaysAway: 9 },
      }),
    );
    // (9-3)*0.025 = +0.15 vs (3-9)*0.025 = -0.15 → clear separation
    expect(rested.situationalShift).toBeGreaterThan(0.1);
    expect(tired.situationalShift).toBeLessThan(-0.1);
    expect(rested.situationalShift - tired.situationalShift).toBeGreaterThan(0.2);
    expect(rested.why.some((x) => /rest edge/i.test(x))).toBe(true);
    expect(tired.whyNot.some((x) => /rest deficit/i.test(x))).toBe(true);
  });

  it("withholds when only tier-5 chatter is available", () => {
    const r = reason(
      ctx({
        observations: [
          obs({ tier: 5, family: "NARRATIVE_SOCIAL", rights: "use-with-caution", lean: undefined }),
        ],
        situation: {},
      }),
    );
    expect(r.publishState).toBe("WITHHOLD");
    expect(r.withholdReasons.some((x) => /tier-5|chatter/i.test(x))).toBe(true);
  });

  it("withholds ELITE_PLAY grade (historically worst) and forbidden-rights data", () => {
    const elite = reason(ctx({ grade: "ELITE_PLAY" }));
    expect(elite.withholdReasons.some((x) => /ELITE/i.test(x))).toBe(true);

    const forbidden = reason(
      ctx({
        observations: [obs({ rights: "forbidden", lean: undefined })],
      }),
    );
    expect(forbidden.withholdReasons.some((x) => /forbidden/i.test(x))).toBe(true);
    expect(forbidden.publishState).toBe("WITHHOLD");
  });

  it("computes edge vs market and respects the close when market is better", () => {
    const positive = reason(
      ctx({
        statedConfidence: 70,
        market: {
          market: "spread",
          fairProb: 0.45,
          line: -3.5,
          bookmakerCount: 8,
          consensusPct: 0.7,
        },
      }),
    );
    expect(positive.edgeVsMarket).not.toBeNull();

    const negative = reason(
      ctx({
        statedConfidence: 55,
        market: {
          market: "spread",
          fairProb: 0.75,
          line: -3.5,
          bookmakerCount: 8,
          consensusPct: 0.9,
        },
      }),
    );
    expect(negative.edgeVsMarket).toBeLessThan(0);
    expect(negative.whyNot.some((x) => /market already prices/i.test(x))).toBe(true);
  });

  it("keeps knowability and evidence health in [0,1] and inside publish gate", () => {
    const r = reason(ctx());
    expect(r.knowability).toBeGreaterThanOrEqual(0);
    expect(r.knowability).toBeLessThanOrEqual(1);
    expect(r.evidenceHealth).toBeGreaterThanOrEqual(0);
    expect(r.evidenceHealth).toBeLessThanOrEqual(1);
    expect(["SHADOW", "WITHHOLD", "CANDIDATE"]).toContain(r.publishState);
  });

  it("explain() produces a compact human spine without raw-confidence claims", () => {
    const c = ctx();
    const r = reason(c);
    const text = explain(c, r);
    expect(text).toMatch(/calibrated P/);
    expect(text).toMatch(/state/);
    // Must not claim certainty or a bare win rate as a probability
    expect(text).not.toMatch(/guarantee/i);
    expect(text).not.toMatch(/\b100%\b/);
  });

  it("signal weight reflects historical slices (MONEYLINE boosted, SPREAD shrunk)", () => {
    const ml = reason(ctx({ pickType: "MONEYLINE" }));
    const sp = reason(ctx({ pickType: "SPREAD" }));
    expect(ml.signalWeight).toBeGreaterThan(sp.signalWeight);
  });
});
