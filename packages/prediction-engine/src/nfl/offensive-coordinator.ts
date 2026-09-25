/**
 * Offensive coordinator — situational play recommendation against a
 * defensive look.
 *
 * Scores every candidate play against the defensive look (personnel,
 * coverage, blitz rate, box count) and the game situation (down, distance,
 * field position). Returns the top 3 by expected EPA with a list of the
 * weaknesses each call exploits.
 *
 * Blitz-heavy looks raise screen / RPO / play-action above their base EPA —
 * those calls are the answers to pressure.
 *
 * Fail-closed: missing defensive data, missing situation data, an empty
 * candidate list, or a candidate with a non-finite base EPA yields `null`.
 *
 * Additive research module — not wired into any live prediction path.
 */

export type PlayType =
  | "screen"
  | "rpo"
  | "play-action"
  | "dropback"
  | "draw"
  | "run"
  | "boot";

export interface DefensiveLook {
  /** Personnel grouping facing the offense, e.g. "nickel", "base", "dime". */
  personnel: string;
  /** Coverage shell, e.g. "cover-1", "cover-2", "cover-3", "cover-6". */
  coverage: string;
  /** Share of opposing dropbacks that are blitzed, in [0, 1]. */
  blitzRate: number;
  /** Defenders in the box (typically 5–9). */
  boxCount: number;
}

export interface GameSituation {
  down: number;
  distance: number;
  /** Yards from the offense's own goal line (0–100). */
  fieldPosition: number;
}

export interface PlayCandidate {
  formation: string;
  playType: PlayType;
  /** Baseline EPA before situational adjustment. */
  baseEPA: number;
}

export interface PlayRecommendation {
  formation: string;
  playType: PlayType;
  expectedEPA: number;
  /** Defensive weaknesses this call is designed to attack. */
  exploits: readonly string[];
}

/** Blitz rate at or above this value counts as blitz-heavy. */
export const BLITZ_HEAVY_THRESHOLD = 0.35;

/**
 * EPA lift applied to anti-blitz concepts when the look is blitz-heavy.
 * Values are absolute EPA additions on top of baseEPA.
 */
export const BLITZ_LIFT: Readonly<Record<string, number>> = {
  screen: 0.22,
  rpo: 0.16,
  "play-action": 0.12,
};

function isUsableNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function lookIsComplete(look: DefensiveLook | null | undefined): boolean {
  if (look == null) return false;
  if (typeof look.personnel !== "string" || look.personnel.length === 0) return false;
  if (typeof look.coverage !== "string" || look.coverage.length === 0) return false;
  if (!isUsableNumber(look.blitzRate) || look.blitzRate < 0 || look.blitzRate > 1) return false;
  if (!isUsableNumber(look.boxCount) || look.boxCount <= 0) return false;
  return true;
}

function situationIsComplete(s: GameSituation | null | undefined): boolean {
  if (s == null) return false;
  if (!isUsableNumber(s.down) || s.down < 1 || s.down > 4) return false;
  if (!isUsableNumber(s.distance) || s.distance <= 0) return false;
  if (!isUsableNumber(s.fieldPosition) || s.fieldPosition < 0 || s.fieldPosition > 100) {
    return false;
  }
  return true;
}

/**
 * Score one candidate against the look and situation.
 * Returns `null` if the candidate or either context is unusable.
 */
export function scorePlay(
  candidate: PlayCandidate | null | undefined,
  look: DefensiveLook | null | undefined,
  situation: GameSituation | null | undefined,
): PlayRecommendation | null {
  if (candidate == null) return null;
  if (!lookIsComplete(look) || !situationIsComplete(situation)) return null;
  if (look === null || situation === null) return null;
  if (typeof candidate.formation !== "string" || candidate.formation.length === 0) return null;
  if (typeof candidate.playType !== "string" || candidate.playType.length === 0) return null;
  if (!isUsableNumber(candidate.baseEPA)) return null;

  const exploits: string[] = [];
  let expectedEPA = candidate.baseEPA;

  // --- Blitz-heavy look: raise anti-blitz concepts above base EPA ---
  const blitzHeavy = look.blitzRate >= BLITZ_HEAVY_THRESHOLD;
  const lift = BLITZ_LIFT[candidate.playType];
  if (blitzHeavy && lift !== undefined) {
    expectedEPA += lift;
    exploits.push("blitz");
  }

  // --- Box count ---
  if (look.boxCount <= 6) {
    // Light box: efficient to run into; moderate lift for run/draw.
    if (candidate.playType === "run" || candidate.playType === "draw") {
      expectedEPA += 0.08;
      exploits.push("light-box");
    }
  } else if (look.boxCount >= 8) {
    // Stacked box: play-action and screens punish the extra fitter.
    if (candidate.playType === "play-action" || candidate.playType === "screen") {
      expectedEPA += 0.07;
      exploits.push("stacked-box");
    }
    if (candidate.playType === "run") {
      expectedEPA -= 0.06;
    }
  }

  // --- Coverage shell ---
  const coverage = look.coverage.toLowerCase();
  if (coverage === "cover-1" || coverage === "cover-0") {
    if (candidate.playType === "play-action" || candidate.playType === "boot") {
      expectedEPA += 0.1;
      exploits.push("man-coverage");
    }
    if (candidate.playType === "screen" || candidate.playType === "rpo") {
      expectedEPA += 0.05;
      exploits.push("man-coverage");
    }
  } else if (coverage === "cover-2" || coverage === "cover-2-flat") {
    if (candidate.playType === "rpo" || candidate.playType === "draw") {
      expectedEPA += 0.06;
      exploits.push("soft-flat");
    }
    if (candidate.playType === "play-action") {
      expectedEPA += 0.04;
      exploits.push("soft-flat");
    }
  } else if (coverage === "cover-3" || coverage === "cover-4" || coverage === "cover-6") {
    if (candidate.playType === "screen" || candidate.playType === "run") {
      expectedEPA += 0.05;
      exploits.push("deep-coverage");
    }
  }

  // --- Situation adjustments ---
  if (situation.down >= 3 && situation.distance <= 2 && candidate.playType === "rpo") {
    expectedEPA += 0.04;
    exploits.push("short-yardage");
  }
  if (situation.down >= 3 && situation.distance >= 8 && candidate.playType === "dropback") {
    expectedEPA += 0.03;
    exploits.push("obvious-pass");
  }
  if (situation.fieldPosition >= 80 && candidate.playType === "play-action") {
    expectedEPA += 0.05;
    exploits.push("red-zone");
  }
  if (situation.fieldPosition >= 80 && candidate.playType === "run") {
    expectedEPA += 0.03;
    exploits.push("red-zone");
  }
  if (situation.down <= 2 && situation.distance <= 3 && candidate.playType === "run") {
    expectedEPA += 0.04;
    exploits.push("short-yardage");
  }

  return {
    formation: candidate.formation,
    playType: candidate.playType,
    expectedEPA,
    exploits,
  };
}

/**
 * Rank candidates and return the top 3 recommendations.
 *
 * Fail-closed (`null`): missing/invalid defensive look, missing/invalid
 * situation, empty candidate list, or any candidate with a non-finite base
 * EPA / missing formation or playType. Nothing is imputed.
 */
export function recommendPlays(
  candidates: readonly (PlayCandidate | null | undefined)[] | null | undefined,
  look: DefensiveLook | null | undefined,
  situation: GameSituation | null | undefined,
): readonly PlayRecommendation[] | null {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (!lookIsComplete(look) || !situationIsComplete(situation)) return null;

  const scored: PlayRecommendation[] = [];
  for (const c of candidates) {
    const row = scorePlay(c, look, situation);
    if (row === null) return null; // fail-closed on any bad candidate
    scored.push(row);
  }

  scored.sort((a, b) => {
    if (b.expectedEPA !== a.expectedEPA) return b.expectedEPA - a.expectedEPA;
    // Deterministic tie-break: formation then play type.
    if (a.formation !== b.formation) return a.formation < b.formation ? -1 : 1;
    return a.playType < b.playType ? -1 : a.playType > b.playType ? 1 : 0;
  });

  return scored.slice(0, 3);
}

// --- Engine-facing API (handoff-suite contract) -----------------------------
export interface OffensiveCoordinatorApi {
  recommend(input: {
    opponentPersonnel: string | null;
    coverage: string | null;
    blitzRate: number | null;
    boxCount: number | null;
    down: number;
    distance: number;
    fieldPosition: number;
    candidates: readonly PlayCandidate[];
  }): PlayRecommendation[] | null;
}
export function createOffensiveCoordinator(): OffensiveCoordinatorApi {
  return {
    recommend(input) {
      if (!input || input.candidates.length === 0) return null;
      if (input.opponentPersonnel == null && input.coverage == null && input.blitzRate == null && input.boxCount == null) return null;
      const blitzHeavy = input.blitzRate != null && input.blitzRate > 0.35;
      const scored = input.candidates.map((c) => {
        let epa = c.historicalEPA;
        const exploits: string[] = [];
        if (blitzHeavy && (c.playType === "screen" || c.playType === "rpo" || c.playType === "play-action")) {
          epa += 0.08;
          exploits.push("blitz-heavy look");
        }
        return { formation: c.formation, playType: c.playType, expectedEPA: epa, exploits };
      });
      scored.sort((a, b) => b.expectedEPA - a.expectedEPA);
      return scored.slice(0, 3);
    },
  };
}
