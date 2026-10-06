/**
 * Duel: candidate model vs the market-anchored baseline on PICKS-H1.
 * Precondition for any MODEL_VERSION bump (L11, LAST_PLAN §4.2).
 */

import type { DuelResult, HoldoutPickRow, Scorecard } from "./types";
import { buildScorecard, type ScorecardOptions } from "./scorecard";

/**
 * Keep rule shared with joint.ts (§4.2): ΔBrier < 0 AND P(better) ≥ 0.75.
 * A duel that fails keeps the candidate PROPOSED; it never ships a bump.
 */
export const DUEL_KEEP_RULE =
  "ΔBrier < 0 AND P(better) ≥ 0.75 on identical PICKS-H1 rows vs marketFairProb";

export type DuelOptions = ScorecardOptions & {
  readonly candidateLabel?: string;
  readonly baselineLabel?: string;
  readonly holdoutId?: "PICKS-H1" | "NFL-H2";
};

/**
 * Score a candidate against the market-anchored baseline.
 *
 * `rows` must already be the holdout selection (callers use selectPicksH1).
 * The baseline is marketFairProb itself — the price every candidate has to
 * beat. `candidateProb` overrides modelProb when the caller is scoring a
 * proposed transform (e.g. A2 shrinkage) rather than a stored version.
 */
export function duel(
  rows: readonly HoldoutPickRow[],
  options?: DuelOptions & {
    readonly candidateProb?: (row: HoldoutPickRow) => number | null;
  },
): DuelResult {
  const candidateProb = options?.candidateProb;
  const prepared: HoldoutPickRow[] = candidateProb
    ? rows.map((r) => {
        const p = candidateProb(r);
        return p == null || !(p > 0 && p < 1) ? r : { ...r, modelProb: p };
      })
    : [...rows];

  const scorecard: Scorecard = buildScorecard(prepared, {
    ...options,
    // A duel is a candidate test, not the historical re-grade harness.
    expectCandidateWorse: options?.expectCandidateWorse ?? false,
  });

  const passesKeepRule =
    Number.isFinite(scorecard.deltaBrier) &&
    scorecard.deltaBrier < 0 &&
    scorecard.pBetter >= 0.75;

  return {
    holdoutId: options?.holdoutId ?? "PICKS-H1",
    candidateLabel: options?.candidateLabel ?? "candidate",
    baselineLabel: options?.baselineLabel ?? "market-anchored (marketFairProb)",
    scorecard,
    passesKeepRule,
    keepRule: DUEL_KEEP_RULE,
  };
}

/**
 * Re-grade historical model versions on PICKS-H1 (verify:holdout DoD).
 *
 * Every version from v5.0.0→v5.2.7 present in the export must score WORSE
 * than market. If any beats market, the harness is wrong and the row is not
 * done. Returns one scorecard per version plus an overall pass flag.
 */
export type VersionRegrade = {
  readonly modelVersion: string;
  readonly n: number;
  readonly scorecard: Scorecard;
  readonly beatsMarket: boolean;
};

export type VerifyHoldoutReport = {
  readonly holdoutId: "PICKS-H1";
  readonly sourcePath: string;
  readonly fromFixture: boolean;
  readonly nHoldout: number;
  readonly versions: readonly VersionRegrade[];
  readonly allWorseThanMarket: boolean;
  readonly failures: readonly string[];
  readonly markdown: string;
};

export function regradeVersions(
  rows: readonly HoldoutPickRow[],
  versions: readonly string[],
  options?: { readonly resamples?: number; readonly seed?: number },
): VersionRegrade[] {
  const out: VersionRegrade[] = [];
  for (const v of versions) {
    const vrows = rows.filter((r) => r.modelVersion === v);
    if (vrows.length === 0) continue;
    const sc = buildScorecard(vrows, {
      ...options,
      expectCandidateWorse: true,
      label: v,
    });
    out.push({
      modelVersion: v,
      n: sc.n,
      scorecard: sc,
      beatsMarket: Number.isFinite(sc.deltaBrier) && sc.deltaBrier < 0,
    });
  }
  return out;
}
