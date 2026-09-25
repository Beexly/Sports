/**
 * Walk-forward eval — live call site for the W2 closing-line benchmark.
 *
 * Runs walk-forward seasons against closing lines and returns the honest
 * skill read (model vs closing accuracy, edge). This is the ship gate from V8.
 */

import {
  walkForwardSeasons,
  runWalkForwardTaxonomy,
  type SeasonGame,
  type ClosingLines,
  type WalkForwardResult,
  type WalkForwardTaxonomyRow,
  type WalkForwardTaxonomyReport,
  type PredictFn,
} from "@sports/prediction-engine";

export type WalkForwardEvalResult =
  | { readonly ok: true; readonly data: WalkForwardResult }
  | { readonly ok: false; readonly reason: string };

/**
 * Run walk-forward seasons and grade against closing lines.
 * Fail-closed when games/lines are missing — never invents a benchmark.
 */
export function runWalkForwardEval(input: {
  readonly games: readonly SeasonGame[];
  readonly predict: PredictFn;
  readonly closingLines: ClosingLines;
  readonly modelId?: string;
  readonly dataWindow?: string;
}): WalkForwardEvalResult {
  if (!Array.isArray(input.games) || input.games.length < 2) {
    return { ok: false, reason: "walk-forward requires ≥2 games across ≥2 seasons" };
  }
  if (!input.closingLines || typeof input.predict !== "function") {
    return { ok: false, reason: "predict fn and closingLines required" };
  }
  const seasons = new Set(input.games.map((g) => g.season));
  if (seasons.size < 2) {
    return { ok: false, reason: "walk-forward requires ≥2 seasons in the game set" };
  }

  try {
    const data = walkForwardSeasons(input.predict, input.games, input.closingLines, {
      modelId: input.modelId,
      dataWindow: input.dataWindow,
    });
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Ship gate from V8: the model ships only when walk-forward beats the close
 * on the sealed holdout. Returns a verdict string, never a silent pass.
 */
export function walkForwardShipGate(result: WalkForwardResult): {
  readonly ship: boolean;
  readonly verdict: string;
  readonly modelAcc: number | null;
  readonly closingAcc: number | null;
  readonly edge: number | null;
  readonly n: number;
} {
  const overall = result.overall;
  if (!overall || overall.n <= 0) {
    return {
      ship: false,
      verdict: "NO_SAMPLES",
      modelAcc: null,
      closingAcc: null,
      edge: null,
      n: 0,
    };
  }
  // Honest default: ship only when the model beats the close on accuracy
  // over a non-trivial sample. The gate is a floor, not a claim of edge.
  const ship = overall.edge > 0 && overall.n >= 30;
  return {
    ship,
    verdict: ship ? "SHIP" : "WITHHOLD",
    modelAcc: overall.modelAcc,
    closingAcc: overall.closingAcc,
    edge: overall.edge,
    n: overall.n,
  };
}

export { walkForwardSeasons };
export type { SeasonGame, ClosingLines, WalkForwardResult, PredictFn };

/**
 * Mondrian taxonomy report — which contexts the model covers and which
 * categories are under-covered. Fail-closed on empty rows.
 */
export function runTaxonomyReport(
  rows: readonly WalkForwardTaxonomyRow[],
  opts?: { readonly level?: number; readonly minSamplesForTrust?: number },
): { readonly ok: true; readonly data: WalkForwardTaxonomyReport } | { readonly ok: false; readonly reason: string } {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "taxonomy requires at least one row" };
  }
  try {
    return { ok: true, data: runWalkForwardTaxonomy(rows, opts) };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
