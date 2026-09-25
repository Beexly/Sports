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
} from "@/lib/intelligence-core";

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
 */
export function enrichPickWithIntelligence(
  pick: PickForIntelligence,
  now: Date = new Date(),
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
  };

  try {
    const fairProb =
      pick.homeFairProb != null && Number.isFinite(pick.homeFairProb)
        ? pick.homeFairProb
        : pick.marketFairProb != null && Number.isFinite(pick.marketFairProb)
          ? pick.marketFairProb
          : null;

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
    };
  } catch {
    return empty;
  }
}

function normalizeGrade(
  grade: string | null | undefined,
): GameBundle["grade"] {
  if (grade === "LEAN" || grade === "SOLID_PLAY" || grade === "STRONG_PLAY" || grade === "ELITE_PLAY") {
    return grade;
  }
  return undefined;
}
