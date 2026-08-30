/**
 * Structural free-spine odds-path honesty (catalog-level, no network).
 *
 * criticalGaps on free-spine today collapse to odds×sport cells that mustSpend
 * via the-odds-api single-clear. Free odds candidates remain gated. This module
 * turns raw counts into a public-safe summary so ops never misread gaps as
 * live probe failures or invent free lines.
 */

export interface FreeSpineOddsPathSummary {
  /** True when requireSpend cells fully explain criticalGaps (paid single-path). */
  readonly paidSinglePath: boolean;
  readonly criticalGaps: number;
  readonly requireSpend: number;
  readonly freeCovered: number | null;
  readonly primaryOddsSource: "the-odds-api";
  readonly freeOddsCandidatesGated: true;
  readonly operatorHint: string;
}

export function summarizeFreeSpineOddsPath(input: {
  readonly criticalGaps: number | null;
  readonly requireSpend: number | null;
  readonly freeCovered: number | null;
}): FreeSpineOddsPathSummary | null {
  if (input.criticalGaps == null || input.requireSpend == null) return null;
  const criticalGaps = input.criticalGaps;
  const requireSpend = input.requireSpend;
  if (criticalGaps <= 0 && requireSpend <= 0) {
    return {
      paidSinglePath: false,
      criticalGaps: 0,
      requireSpend: 0,
      freeCovered: input.freeCovered,
      primaryOddsSource: "the-odds-api",
      freeOddsCandidatesGated: true,
      operatorHint:
        "Critical dual-path gaps clear for free multi-source spine. Odds still catalog-primary the-odds-api; free odds candidates stay gated until legal clear.",
    };
  }

  const paidSinglePath = requireSpend > 0 && requireSpend === criticalGaps;
  return {
    paidSinglePath,
    criticalGaps,
    requireSpend,
    freeCovered: input.freeCovered,
    primaryOddsSource: "the-odds-api",
    freeOddsCandidatesGated: true,
    operatorHint: paidSinglePath
      ? `Odds free dual-path ABSENT: ${criticalGaps} sport cell(s) single-cleared via the-odds-api (mustSpend). Free odds candidates gated — never invent lines.`
      : `Free multi-source dual-path shortfalls: criticalGaps=${criticalGaps} requireSpend=${requireSpend}. Expand legal free adapters; never invent scores or lines.`,
  };
}
