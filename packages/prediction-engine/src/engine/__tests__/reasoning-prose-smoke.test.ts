/**
 * Prose smoke suite — scores the reasoning the engine RENDERS today, without
 * waiting for picks to settle in production.
 *
 * The production benchmark (apps/web/scripts/bench-reasoning.mts) can only score
 * stored rows, so a template change is invisible to it until new picks settle
 * days later, and meanwhile the scorecard mixes eras. This suite closes that gap
 * by driving scoreGame over fixed contexts, harvesting the real reasoning text,
 * and scoring it through the same contract. A prose regression shows up here in
 * seconds instead of in a production cohort next week.
 *
 * Calibration is excluded (no outcomes): these cases test GROUNDING, CONSISTENCY,
 * SPECIFICITY and FALSIFIER only. That is stated so nobody reads the rubric as a
 * forecast quality signal.
 */
import { describe, expect, it } from "vitest";
import { impliedProbabilityToAmerican, scoreGame, type OddsInput } from "../../scoring";
import { runSuite, type BenchmarkCase, type ReasonArtifact } from "../reasoning-benchmark";
import type { GameContextInput } from "@sports/types";

// Date objects, not ISO strings: the freshness gate compares Dates and silently
// yields zero picks when handed strings.
const AT = new Date("2026-10-23T12:00:00Z");
const COMMENCE = new Date("2026-10-23T18:00:00Z");
const BOOKS = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbet", "bet365", "wynn", "espnbet"];

/**
 * A two-way spread priced so the home side genuinely carries an edge (0.55 implied
 * against 0.45, with hold). Flat -110/-110 leaves the edge near zero and the pick
 * never clears the publish gate.
 */
function spread(ctx?: GameContextInput): OddsInput {
  return {
    gameId: "smoke",
    homeTeam: "Home Club",
    awayTeam: "Away Club",
    commenceTime: COMMENCE,
    sport: "NFL",
    bookmakerOdds: BOOKS.map((bookmaker, i) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: i < 6 ? -3.5 : 3.5,
      homeSpreadPrice: impliedProbabilityToAmerican(0.55 * 1.03),
      awaySpreadPrice: impliedProbabilityToAmerican(0.45 * 1.03),
    })),
    context: ctx,
  };
}

// Production-shaped: a thin context clears no gate, because confidence needs the
// form buckets too. These mirror the shape real games carry.
const CLEAN: GameContextInput = {
  openingSpread: -1.5,
  currentSpread: -3.5,
  restDaysHome: 7,
  restDaysAway: 3,
  homeAtsForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
  homeAtsFormAtHome: { wins: 5, losses: 1, pushes: 0, sampleSize: 6 },
  headToHeadForm: { wins: 4, losses: 1, pushes: 0, sampleSize: 5 },
  scheduleDensityHome: 1,
  scheduleDensityAway: 4,
  dataFreshnessMinutes: 2,
};

const ADVERSE: GameContextInput = { ...CLEAN, marketSpreadDispersion: 2.4, scheduleDensityAway: 4 };

/** Citation vocabulary: every surface key this suite can name, humanised. */
const VOCAB: ReadonlyArray<[phrase: string, key: string]> = [
  ["market fair", "marketFairProb"],
  ["engine fair", "fairProbability"],
  ["bookmakers", "bookmakerCount"],
  ["line movement", "lineMovementScore"],
  ["dispersion", "dispersionScore"],
  ["rest", "restAdvantageScore"],
];

function harvest(ctx: GameContextInput | undefined, label: string): { kase: BenchmarkCase; arts: ReasonArtifact[] } {
  const picks = scoreGame(spread(ctx), AT);
  const kase: BenchmarkCase = {
    id: label,
    loadedSurfaces: [
      "marketFairProb",
      "fairProbability",
      "bookmakerCount",
      "lineMovementScore",
      "dispersionScore",
      "restAdvantageScore",
    ],
    outcome: null,
    marketProb: 0.5,
    // No per-pick fair values in facts: each rendered pick prices its own side, so
    // a global figure would flag genuine renders as inconsistent.
    facts: {},
  };
  const arts = picks.map((p, i) => {
    const text = p.reasoning.toLowerCase();
    return {
      caseId: label,
      reasonText: p.reasoning,
      prob: 0.55,
      side: "HOME" as const,
      citedSurfaces: VOCAB.filter(([phrase]) => text.includes(phrase)).map(([, key]) => key),
      // Distinct ids are not required by runSuite, but keeping them aids failures.
      ...(i === 0 ? {} : {}),
    };
  });
  return { kase, arts };
}

describe("rendered prose smoke", () => {
  it("renders picks at all (the harness would be vacuous otherwise)", () => {
    expect(scoreGame(spread(CLEAN), AT).length).toBeGreaterThan(0);
  });

  it("keeps the prose grounded, consistent and specific on a clean read", () => {
    const { kase, arts } = harvest(CLEAN, "clean");
    const card = runSuite([kase], arts);
    expect(card.meanGrounding).toBeGreaterThanOrEqual(0.9);
    expect(card.meanConsistency).toBeGreaterThanOrEqual(0.95);
    expect(card.meanRubric).toBeGreaterThanOrEqual(70);
  });

  it("cites the number of books that priced the market", () => {
    const { arts } = harvest(CLEAN, "clean");
    // No backslash escapes at all: this file has been bitten twice by \d and
    // \b arriving mangled, so a digit class does the same job safely.
    const hit = arts.some((a) => a.reasonText.match(/([0-9]+) books/) !== null);
    expect(hit).toBe(true);
  });

  it("clears the specificity floor on a rendered spread", () => {
    const { kase, arts } = harvest(CLEAN, "clean");
    expect(runSuite([kase], arts).meanSpecificity).toBeGreaterThan(0.5);
  });

  it("names the market and engine fair values it recorded", () => {
    const { arts } = harvest(CLEAN, "clean");
    const text = arts.map((a) => a.reasonText).join(" ");
    expect(text).toMatch(/Market fair: \d+%/);
  });

  it("states no falsifier on a clean read", () => {
    const { arts } = harvest(CLEAN, "clean");
    expect(arts.every((a) => !a.reasonText.includes("Would be wrong if"))).toBe(true);
  });

  it("states a falsifier when the market is dispersed", () => {
    const { arts } = harvest(ADVERSE, "adverse");
    const withFalsifier = arts.filter((a) => a.reasonText.includes("Would be wrong if"));
    expect(withFalsifier.length).toBeGreaterThan(0);
  });

  it("scores full falsifier credit on the adverse render", () => {
    const { kase, arts } = harvest(ADVERSE, "adverse");
    const card = runSuite([kase], arts);
    expect(card.meanFalsifier).toBeGreaterThan(0.6);
  });

  it("never renders an unloaded citation as loaded", () => {
    const { kase, arts } = harvest(CLEAN, "clean");
    const card = runSuite([kase], arts);
    const unnamed = card.cases.flatMap((c) => c.failures).filter((f) => f.startsWith("cited unloaded"));
    expect(unnamed).toEqual([]);
  });
});
