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
  type SignalShadowPolicy,
} from "@/lib/intelligence-core";
import {
  wireEverything,
  coverageReport,
  type UniversalSignals,
} from "@/lib/intelligence-core/universal-wiring";
import type { BundleResolution, LoadedBundleSurfaces } from "@/lib/intelligence-core/db-loaders";

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
  /**
   * How many of the bundle's twelve raw DB surfaces actually returned rows.
   * This is the "0 of 14 fields filled" counter, measured rather than assumed.
   */
  readonly dbSurfacesFilled: number;
  /** Total rows read across all DB surfaces. 0 means the loaders found nothing. */
  readonly dbRowCount: number;
  /** Which surfaces were empty, for the honest-empty-state note. */
  readonly dbSurfacesEmpty: readonly string[];
  /** Resolution trace: abbreviations, season/week, and any per-surface notes. */
  readonly dbResolution: BundleResolution | null;
  /**
   * SHADOW-ONLY accounting. `observationCount` above counts every observation
   * that was wired in; this says how many of those were actually allowed to
   * move the calibrated number. Inert (all zeros) unless a policy was passed.
   */
  readonly shadowReport: IntelligenceResult["shadowReport"] | null;
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
 * `surfaces` carries the real DB rows (injuries, ratings, snaps, NGS, player
 * stats, game signals) loaded by `loadBundleSurfaces`. Pass it to wire the
 * bundle's twelve raw surfaces; omit it and the engine reasons from market
 * context alone. Keeping the DB out of this function is deliberate — it stays
 * synchronous and testable, and a failed load degrades to market-only rather
 * than throwing.
 *
 * When `signals` is supplied, `wireEverything` (the ALL-knowing wiring map)
 * produces the full observation list and feeds it into the reasoning spine
 * via `extraObservations`. Without it, only market/situation context is used.
 */
export function enrichPickWithIntelligence(
  pick: PickForIntelligence,
  now: Date = new Date(),
  signals?: UniversalSignals,
  /** Pre-loaded DB surfaces. Omit to run on market context alone. */
  surfaces?: LoadedBundleSurfaces,
  /**
   * SHADOW MODE: pass `shadowPolicy` to hold named families OUT of the calibrated
   * spine while still counting and reporting them. Omit it (the default) and
   * every family calibrates exactly as it does today. Build it with
   * `shadowOnly(families, justification)` from `@/lib/intelligence-core` — the
   * justification is mandatory, so this cannot be switched on by accident.
   */
  shadowPolicy?: SignalShadowPolicy,
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
    dbSurfacesFilled: 0,
    dbRowCount: 0,
    dbSurfacesEmpty: [],
    dbResolution: surfaces?.resolution ?? null,
    shadowReport: null,
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
      // --- THE WIRING: real DB rows into the bundle's raw surfaces ---
      // Before this, all twelve of these were undefined on every pick, so
      // the reasoning spine saw market context only.
      ...(surfaces
        ? {
            homeInjuries: surfaces.homeInjuries,
            awayInjuries: surfaces.awayInjuries,
            homeNgs: surfaces.homeNgs,
            awayNgs: surfaces.awayNgs,
            homePlayerStats: surfaces.homePlayerStats,
            awayPlayerStats: surfaces.awayPlayerStats,
            homeRatings: surfaces.homeRatings,
            awayRatings: surfaces.awayRatings,
            weather: surfaces.weather,
            gameSignals: surfaces.gameSignals,
            homeSnaps: surfaces.homeSnaps,
            awaySnaps: surfaces.awaySnaps,
          }
        : {}),
    };

    const result = runIntelligence(
      shadowPolicy ? { ...bundle, shadowPolicy } : bundle,
    );

    const dbSurfacesFilled = surfaces
      ? countFilledSurfaces(surfaces)
      : 0;
    const dbRowCount = surfaces ? totalRowCount(surfaces) : 0;

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
      dbSurfacesFilled,
      dbRowCount,
      dbSurfacesEmpty: surfaces ? emptySurfaceNames(surfaces) : SURFACE_NAMES,
      dbResolution: surfaces?.resolution ?? null,
      shadowReport: result.shadowReport,
    };
  } catch {
    return empty;
  }
}

/** The twelve raw DB surfaces on GameBundle, in declaration order. */
const SURFACE_NAMES = [
  "homeInjuries",
  "awayInjuries",
  "homeNgs",
  "awayNgs",
  "homePlayerStats",
  "awayPlayerStats",
  "homeRatings",
  "awayRatings",
  "weather",
  "gameSignals",
  "homeSnaps",
  "awaySnaps",
] as const;

function countFilledSurfaces(s: LoadedBundleSurfaces): number {
  return SURFACE_NAMES.reduce(
    (n, key) => (s[key].length > 0 ? n + 1 : n),
    0,
  );
}

function totalRowCount(s: LoadedBundleSurfaces): number {
  return SURFACE_NAMES.reduce((n, key) => n + s[key].length, 0);
}

function emptySurfaceNames(s: LoadedBundleSurfaces): string[] {
  return SURFACE_NAMES.filter((key) => s[key].length === 0);
}

/**
 * Assemble UniversalSignals from a pick row's market + situation fields.
 * Missing modules are omitted — wireEverything handles the gaps as
 * "no observation" rather than inventing one.
 */

/**
 * Project intelligence for a viewer entitlement.
 *
 * FREE viewers may receive the numeric spine (calibratedProb, knowability, …)
 * but must not receive percent-formatted model prose or the internal
 * "(model signal)" marker anywhere in the JSON. PRO+ keeps the full explain.
 */
export function projectPickIntelligenceForViewer(
  intel: PickIntelligence,
  canSeeConfidence: boolean,
): PickIntelligence {
  if (canSeeConfidence) return intel;
  return {
    calibratedProb: intel.calibratedProb,
    situationalShift: intel.situationalShift,
    knowability: intel.knowability,
    evidenceHealth: intel.evidenceHealth,
    publishState: intel.publishState,
    // sixQuestions.marketBelieves / improvesDecisions embed "NN%" model language.
    sixQuestions: null,
    familyWeights: intel.familyWeights,
    why: [],
    whyNot: [],
    summary: null,
    observationCount: intel.observationCount,
    familyCoverage: intel.familyCoverage,
    dbSurfacesFilled: intel.dbSurfacesFilled,
    dbRowCount: intel.dbRowCount,
    dbSurfacesEmpty: intel.dbSurfacesEmpty,
    dbResolution: intel.dbResolution,
    // Pure counting metadata (families, counts, justification) — no percentages
    // or model prose, so it is safe for the FREE projection.
    shadowReport: intel.shadowReport,
  };
}

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
