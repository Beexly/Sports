/**
 * Law 5, column five: a signal that votes must be SHOWABLE.
 *
 * The 23 continuous signals were wired on 2026-10-01 — each declares a `homeSign`
 * and a `neutralValue` and can move the independent home probability. A signal
 * that changes a number but cannot be shown changing it is not wired, it is
 * invisible. This asserts the trace surfaces them WITH their arithmetic, and
 * marks them excluded from the confidence sum (the slate applies the tilt to
 * trueProb BEFORE scoring, so counting it again would double-count).
 *
 * Tested against the real trace module over a REAL scored pick, with the vote
 * factors injected the way `generate-signal-slate.ts` writes them. Enumerated
 * from the factor array, not a hardcoded list: a signal wired later must appear
 * here with no change to the trace module.
 */
import { describe, expect, it } from "vitest";
import { buildReasoningTrace } from "../reasoning-trace.js";
import type { OddsInput, ScoredPick, FactorDetail } from "@sports/types";

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

/** The base pick shape buildReasoningTrace reads. Real fields, real types. */
function basePick(factors: FactorDetail[]): ScoredPick {
  const mk = (name: string, weight: number, impact: FactorDetail["impact"] = "positive"): FactorDetail => ({
    name, weight, impact, description: `${name} detail`,
  });
  return {
    gameId: "cs-1",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    pickType: "MONEYLINE",
    pickedSide: "HOME",
    // The fixture must reconcile: consensus 30 + depth 20 + base 10 = 60.
    // An earlier draft claimed 62; the trace correctly refused to reconcile it,
    // which is exactly the check that makes the other assertions trustworthy.
    confidence: 60,
    rankingScore: 60,
    tier: "STANDARD",
    edgeScore: 55,
    factorBreakdown: {
      consensusScore: 30,
      marketDepthScore: 20,
      edgeComponentScore: 5,
      // Every scalar the ML sum reads. Omitting any one leaves it undefined,
      // which reaches the arithmetic as NaN and the trace cannot reconcile --
      // correctly, since it cannot invent a term it was not given.
      volatilityPenalty: 0,
      lineMovementScore: 0,
      restAdvantageScore: 0,
      historicalFormScore: 0,
      dataQualityPenalty: 0,
      factors: [...factors, mk("Book Consensus", 30), mk("Market Depth", 20)],
      fairProbability: 0.87,
      marketFairProb: 0.85,
      restAdvantageScore: 0,
      venueFormScore: 0,
      headToHeadScore: 0,
      uncertaintyPenalty: 0,
      scheduleStressScore: 0,
      crossMarketScore: 0,
      dataQualityScore: 100,
    },
    selection: "Chiefs ML",
    line: null,
    modelVersion: "v5.3.0",
    dataFreshnessAt: new Date("2026-04-15T18:00:00Z"),
  } as unknown as ScoredPick;
}

function input(): OddsInput {
  return {
    gameId: "cs-1",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker, market: "H2H" as const, homePrice: -800, awayPrice: 650,
    })),
    context: { bookmakerCoverageMax: TEN_BOOKS.length },
  };
}

/** A vote factor exactly as generate-signal-slate.ts writes it. */
function voteFactor(signalId: string, tilt: number): FactorDetail {
  return {
    name: `Continuous signal — ${signalId}`,
    impact: tilt > 0 ? "positive" : "negative",
    description:
      `Log-odds tilt ${tilt.toFixed(4)} toward ${tilt > 0 ? "home" : "away"} ` +
      `from raw 1.2400, neutral 1, delta 0.2400, sign + at trustWeight 0.07 (MICROCLIMATE).`,
    weight: Math.min(15, Math.round(Math.abs(tilt) * 100)),
  };
}

describe("reasoning trace — continuous signal votes are visible", () => {
  it("names every voting signal with its arithmetic", () => {
    const votes = [
      voteFactor("nfl_wind_elasticity", 0.0231),
      voteFactor("nfl_turf_surface_fatigue", -0.0117),
    ];
    const trace = buildReasoningTrace(basePick(votes), input());
    const labels = trace.arithmetic.terms.map((t) => t.label);
    expect(labels).toContain("Continuous signal: nfl_wind_elasticity");
    expect(labels).toContain("Continuous signal: nfl_turf_surface_fatigue");

    const term = trace.arithmetic.terms.find(
      (t) => t.label === "Continuous signal: nfl_wind_elasticity",
    )!;
    // The arithmetic must survive into the trace, not just the name.
    expect(term.exclusionReason).toMatch(/raw 1\.2400/);
    expect(term.exclusionReason).toMatch(/neutral 1/);
    expect(term.exclusionReason).toMatch(/sign \+/);
    expect(term.exclusionReason).toMatch(/trustWeight 0\.07/);
    expect(term.exclusionReason).toMatch(/MICROCLIMATE/);
  });

  it("marks continuous votes EXCLUDED from the confidence sum", () => {
    const trace = buildReasoningTrace(basePick([voteFactor("nfl_wind_elasticity", 0.0231)]), input());
    const terms = trace.arithmetic.terms.filter((t) => t.label.startsWith("Continuous signal:"));
    expect(terms.length).toBeGreaterThan(0);
    for (const t of terms) {
      expect(t.enteredSum).toBe(false);
      expect(t.exclusionReason).toMatch(/double-count/);
    }
  });

  it("the trace still reconciles exactly with continuous votes present", () => {
    const trace = buildReasoningTrace(
      basePick([voteFactor("nfl_wind_elasticity", 0.0231), voteFactor("nfl_turf_surface_fatigue", -0.0117)]),
      input(),
    );
    expect(trace.arithmetic.reconciles).toBe(true);
    expect(trace.arithmetic.residual).toBe(0);
  });

  it("a pick with NO continuous votes has no continuous terms", () => {
    const trace = buildReasoningTrace(basePick([]), input());
    expect(trace.arithmetic.terms.some((t) => t.label.startsWith("Continuous signal:"))).toBe(false);
  });

  it("a signal wired LATER appears with no change to the trace module", () => {
    // The enumeration is by prefix, not a fixed list. This is what makes Law 5
    // column five a property of the system rather than a to-do for each signal.
    const trace = buildReasoningTrace(
      basePick([voteFactor("some_signal_invented_next_year", 0.05)]),
      input(),
    );
    expect(trace.arithmetic.terms.map((t) => t.label)).toContain(
      "Continuous signal: some_signal_invented_next_year",
    );
  });
});
