/**
 * Pre-mortem comparator.
 *
 * Takes a published pre-mortem (the 4 bullets we shipped at publish time)
 * and a LossAutopsy.rootCause + lessonTags, then tags each bullet as one of:
 *
 *   - CALLED — this bullet's factor matches the actual loss cause.
 *   - DID_NOT_HAPPEN — this bullet's failure mode didn't occur.
 *   - (implicit) MISSED — the actual cause wasn't in any pre-mortem bullet.
 *
 * Powers:
 *   - The Loss Room "Pre-mortem comparison" panel.
 *   - The Twitter bot post-mortem thread post 4 ("what we got wrong").
 *   - The Model Journal weekly "pre-mortem performance" section.
 *
 * Spec: docs/product/pre-mortem-pipeline-spec.md
 *       docs/product/ledger-and-loss-room-spec.md
 */

import type { FactorKey } from "./templates";

export type LossRootCause =
  | "DATA_GAP"
  | "STALE_LINE"
  | "INJURY_SHOCK"
  | "WEATHER"
  | "OFFICIATING"
  | "VARIANCE"
  | "MODEL_DRIFT"
  | "HUMAN_OVERRIDE"
  | "OTHER";

export type BulletTag = "CALLED" | "DID_NOT_HAPPEN";

export type CoverageVerdict = "COMPLETE" | "INCOMPLETE";

export interface PreMortemBulletForCompare {
  factorKey: FactorKey;
  severityRank: number;
  text: string;
}

export interface CompareInput {
  bullets: PreMortemBulletForCompare[];
  rootCause: LossRootCause;
  lessonTags: string[];
}

export interface BulletComparison {
  factorKey: FactorKey;
  severityRank: number;
  text: string;
  tag: BulletTag;
}

export interface PreMortemComparisonResult {
  called: FactorKey[];
  didNotHappen: FactorKey[];
  missed: LossRootCause[]; // empty array when at least one bullet was CALLED
  coverage: CoverageVerdict;
  perBullet: BulletComparison[];
}

/**
 * Mapping from LossRootCause to the factor(s) whose pre-mortem bullets
 * would have called it.
 *
 * Some root causes don't map to any factor (variance, human override) —
 * these always read as MISSED because the pre-mortem pipeline can't
 * predict them.
 */
const ROOT_CAUSE_TO_FACTORS: Record<LossRootCause, FactorKey[]> = {
  DATA_GAP: ["dataQuality"],
  STALE_LINE: ["lineMovement", "consensus"],
  INJURY_SHOCK: ["restAdvantage"],          // when injury affects rest/lineup
  WEATHER: [],                              // not currently a factor template
  OFFICIATING: [],                          // outside the model's scope
  VARIANCE: [],                             // by definition, not a factor read
  MODEL_DRIFT: [],                          // catches a weight problem, not a factor failure
  HUMAN_OVERRIDE: [],                       // operator override, not a factor failure
  OTHER: [],
};

export function comparePreMortem(input: CompareInput): PreMortemComparisonResult {
  const matchingFactors = ROOT_CAUSE_TO_FACTORS[input.rootCause] ?? [];

  const perBullet: BulletComparison[] = input.bullets.map((bullet) => {
    const matched = matchingFactors.includes(bullet.factorKey);
    return {
      factorKey: bullet.factorKey,
      severityRank: bullet.severityRank,
      text: bullet.text,
      tag: matched ? "CALLED" : "DID_NOT_HAPPEN",
    };
  });

  const called = perBullet.filter((b) => b.tag === "CALLED").map((b) => b.factorKey);
  const didNotHappen = perBullet
    .filter((b) => b.tag === "DID_NOT_HAPPEN")
    .map((b) => b.factorKey);

  // If no bullet was CALLED, the root cause is MISSED.
  const missed: LossRootCause[] = called.length === 0 ? [input.rootCause] : [];

  // Coverage is COMPLETE only when at least one bullet was CALLED.
  const coverage: CoverageVerdict = called.length > 0 ? "COMPLETE" : "INCOMPLETE";

  return {
    called,
    didNotHappen,
    missed,
    coverage,
    perBullet,
  };
}

/**
 * Helper: produces a one-line narrative summary of a comparison result.
 * Useful for the Twitter bot post-mortem thread (post 4) and the Model
 * Journal weekly digest.
 */
export function summarizeComparison(
  result: PreMortemComparisonResult,
  friendlyFactorName: (factor: FactorKey) => string = (f) => f,
): string {
  if (result.coverage === "COMPLETE" && result.called.length === 1) {
    const calledFactor = result.called[0];
    return calledFactor
      ? `Pre-mortem called it — the ${friendlyFactorName(calledFactor)} bullet matched the actual cause.`
      : "Pre-mortem coverage marked complete, but no matching factor was recorded.";
  }
  if (result.coverage === "COMPLETE" && result.called.length > 1) {
    const names = result.called.map(friendlyFactorName).join(" and ");
    return `Pre-mortem called it — ${names} bullets both matched the actual cause.`;
  }
  // INCOMPLETE
  const missedCause = result.missed[0] ?? "OTHER";
  return `Pre-mortem missed — the actual cause (${missedCause}) was not in any bullet. Coverage gap to address.`;
}
