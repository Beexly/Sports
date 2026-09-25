/**
 * Intelligence enrichment — runs the all-knowing reasoning spine
 * (lib/intelligence-core) on a pick and returns the six questions,
 * family weights, and publish state for the website surface.
 *
 * Fail-open: never blocks a pick response when intelligence cannot run.
 */

import {
  runIntelligence,
  type GameBundle,
  type IntelligenceResult,
  type SignalObservation,
} from "@/lib/intelligence-core";
import {
  wireEverything,
  coverageReport,
  type UniversalSignals,
} from "@/lib/intelligence-core/universal-wiring";

export interface PickIntelligence {
  readonly calibratedProb: number | null;
  readonly situationalShift: number | null;
  readonly knowability: number | null;
  readonly evidenceHealth: number | null;
  readonly publishState: string | null;
  readonly sixQuestions: IntelligenceResult["sixQuestions"] | null;
  readonly familyWeights: Record<string, number> | null;
  readonly why: readonly string[];
  readonly whyNot: readonly string[];
  readonly summary: string | null;
  readonly observationCount: number;
  /** Coverage of the universal-wiring map: how many families produced observations. */
  readonly familyCoverage: {
    readonly total: number;
    readonly familiesCovered: number;
    readonly familiesMissing: readonly string[];
  } | null;
}

export interface PickForIntelligence {
  readonly id: string;
  readonly selection: string;
  readonly pickType: string;
  readonly confidence: number | null;
  readonly reasoning: string | null;
  readonly sportKey: string;
  readonly commenceTime: Date | string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeFairProb: number | null;
  readonly awayFairProb: number | null;
  readonly marketFairProb?: number | null;
  readonly line?: number | null;
  readonly consensusPct?: number | null;
  readonly bookmakerCount?: number | null;
  readonly modelVersion?: string | null;
  readonly pickGrade?: string | null;
}

/**
 * Build a GameBundle from a pick row and run the intelligence engine.
 *
 * When `signals` is supplied, `wireEverything` (the ALL-knowing wiring map)
 * produces the full observation list and feeds it into the reasoning spine
 * via `extraObservations`. Without it, only market/situation context is used.
 */
export function enrichPickWithIntelligence(
  pick: PickForIntelligence,
  now: Date = new Date(),
  signals?: UniversalSignals,
): PickIntelligence {
  const empty: PickIntelligence = {
    calibratedProb: null,
    situationalShift: null,
    knowability: null,
    evidenceHealth: null,
    publishState: null,
    sixQuestions: null,
    familyWeights: null,
    why: [],
    whyNot: [],
    summary: null,
    observationCount: 0,
    familyCoverage: null,
  };

  try {
    const fairProb =
      pick.homeFairProb != null && Number.isFinite(pick.homeFairProb)
        ? pick.homeFairProb
        : pick.marketFairProb != null && Number.isFinite(pick.marketFairProb)
          ? pick.marketFairProb
          : null;

    // THE ALL-KNOWING WIRING: every module in the repo → observations.
    // This is what makes the reasoning spine see everything, not just market.
    let extraObservations: readonly SignalObservation[] = [];
    let familyCoverage: PickIntelligence["familyCoverage"] = null;
    if (signals) {
      try {
        extraObservations = wireEverything({ ...signals, now });
        const cov = coverageReport(extraObservations);
        familyCoverage = {
          total: cov.total,
          familiesCovered: cov.familiesCovered,
          familiesMissing: cov.familiesMissing,
        };
      } catch {
        // fail-open: universal wiring never blocks a pick response
        extraObservations = [];
        familyCoverage = null;
      }
    }

    const bundle: GameBundle = {
      gameId: pick.id,
      sport: pick.sportKey,
      selection: pick.selection,
      pickType: (["SPREAD", "TOTAL", "MONEYLINE", "PROP"] as const).includes(
        pick.pickType as "SPREAD",
      )
        ? (pick.pickType as GameBundle["pickType"])
        : "MONEYLINE",
      commenceTime:
        typeof pick.commenceTime === "string"
          ? pick.commenceTime
          : pick.commenceTime.toISOString(),
      homeTeam: pick.homeTeamName,
      awayTeam: pick.awayTeamName,
      market: {
        market: pick.pickType,
        fairProb,
        line: pick.line ?? null,
        bookmakerCount: pick.bookmakerCount ?? null,
        consensusPct: pick.consensusPct ?? null,
      },
      extraObservations,
      modelVersion: pick.modelVersion ?? "v5.2.7",
      statedConfidence: pick.confidence,
      grade: normalizeGrade(pick.pickGrade),
      now,
    };

    const result = runIntelligence(bundle);

    return {
      calibratedProb: result.calibratedProb,
      situationalShift: result.situationalShift,
      knowability: result.knowability,
      evidenceHealth: result.evidenceHealth,
      publishState: result.publishState,
      sixQuestions: result.sixQuestions,
      familyWeights: result.familyWeights as Record<string, number>,
      why: result.why,
      whyNot: result.whyNot,
      summary: result.summary,
      observationCount: result.observationCount,
      familyCoverage,
    };
  } catch {
    return empty;
  }
}

/**
 * Assemble UniversalSignals from a pick row's market + situation fields.
 * Missing modules are omitted — wireEverything handles the gaps as
 * "no observation" rather than inventing one.
 */
export function universalSignalsFromPick(pick: PickForIntelligence): UniversalSignals {
  const fairProb =
    pick.homeFairProb != null && Number.isFinite(pick.homeFairProb)
      ? pick.homeFairProb
      : pick.marketFairProb != null && Number.isFinite(pick.marketFairProb)
        ? pick.marketFairProb
        : null;
  const awayProb = fairProb != null ? 1 - fairProb : null;

  return {
    market: {
      consensus:
        pick.line != null && pick.bookmakerCount != null
          ? {
              line: pick.line,
              total: 0,
              books: pick.bookmakerCount,
            }
          : undefined,
      devig:
        fairProb != null && awayProb != null
          ? { homeProb: fairProb, awayProb }
          : undefined,
    },
  };
}

function normalizeGrade(
  grade: string | null | undefined,
): GameBundle["grade"] {
  if (grade === "LEAN" || grade === "SOLID_PLAY" || grade === "STRONG_PLAY" || grade === "ELITE_PLAY") {
    return grade;
  }
  return undefined;
}
