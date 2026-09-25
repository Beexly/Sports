/**
 * Edge-lab honesty bridge — wires close-distillation, trials-registry
 * (feature admission with BH-FDR), and walk-forward taxonomy source into
 * the live eval surface.
 *
 * This is the "did the model earn it" layer: distill the predicted move
 * from non-closing features, record feature-admission trials with
 * Benjamini-Hochberg FDR control, and convert settled picks into taxonomy
 * rows for Mondrian coverage.
 *
 * Fail-closed on missing inputs. Never fabricates a decision-time price.
 */

import {
  trainCloseDistiller,
  scoreDistillation,
  predictedMoveEdge,
  type CloseRow,
  type CloseDistiller,
  type DistillationFoldScore,
} from "@sports/prediction-engine";
import {
  createTrialsRegistry,
  recordFeatureAdmissionTrial,
  decideFamilyAdmissions,
  benjaminiHochberg,
  type TrialsRegistry,
  type FamilyAdmissionsResult,
  type BhResult,
} from "@sports/prediction-engine";
import {
  realGameContextFromPreGame,
  settledHistoricalPickToTaxonomyRow,
} from "@sports/prediction-engine";

export type HonestEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

// ── Close distillation ─────────────────────────────────────────────────────

export interface CloseDistillationResult {
  readonly distiller: CloseDistiller;
  readonly foldScores: readonly DistillationFoldScore[];
}

/**
 * Train a close distiller: predict the closing line from non-closing
 * features. The target must never appear as a feature — the function
 * throws on closing-line feature keys. Then score it via a 2-fold split.
 */
export function evalCloseDistillation(input: {
  readonly rows: readonly CloseRow[];
  readonly featureKeys: readonly string[];
  readonly lambda?: number;
}): HonestEval<CloseDistillationResult> {
  const { rows, featureKeys, lambda } = input;
  if (!Array.isArray(rows) || rows.length < 5) {
    return { ok: false, reason: "need at least 5 close rows to distill" };
  }
  if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
    return { ok: false, reason: "featureKeys must be non-empty" };
  }
  try {
    const distiller = trainCloseDistiller(rows as CloseRow[], {
      featureKeys: featureKeys as string[],
      lambda,
    });
    if (!distiller) {
      return { ok: false, reason: "trainCloseDistiller returned null (insufficient data)" };
    }
    // 2-fold chronological split for the distillation score.
    const cut = Math.max(1, Math.floor(rows.length / 2));
    const foldScores: DistillationFoldScore[] = [
      scoreDistillation(
        distiller,
        rows.slice(0, cut) as CloseRow[],
        rows.slice(cut) as CloseRow[],
        1,
      ),
      scoreDistillation(
        distiller,
        rows.slice(cut) as CloseRow[],
        rows.slice(0, cut) as CloseRow[],
        2,
      ),
    ];
    return {
      ok: true,
      data: {
        distiller,
        foldScores,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Predicted-move edge: distiller-predicted close minus the decision-time
 * implied probability. decisionPrice is DECIMAL ODDS (> 1). Fail-closed when
 * the decision price is missing — the module refuses to run against a
 * fabricated price.
 */
export function evalPredictedMoveEdge(input: {
  readonly predictedClose: number;
  readonly decisionPrice: number | null;
}): HonestEval<number> {
  const { predictedClose, decisionPrice } = input;
  if (!Number.isFinite(predictedClose) || predictedClose <= 0 || predictedClose >= 1) {
    return { ok: false, reason: "predictedClose must be finite in (0,1)" };
  }
  if (decisionPrice === null || !Number.isFinite(decisionPrice)) {
    return {
      ok: false,
      reason: "decisionPrice missing — must never run against a fabricated price",
    };
  }
  if (decisionPrice <= 1) {
    return { ok: false, reason: "decisionPrice must be decimal odds > 1" };
  }
  try {
    const edge = predictedMoveEdge({
      predictedClose,
      decisionPrice,
    });
    return { ok: true, data: Number(edge.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Trials registry (feature admission, BH-FDR) ────────────────────────────

export interface FeatureAdmissionOutcome {
  readonly registry: TrialsRegistry;
  readonly admissions: FamilyAdmissionsResult;
  readonly bh: BhResult;
}

/**
 * Record a feature-admission trial and decide admissions for the family
 * under Benjamini-Hochberg FDR control.
 */
export function evalFeatureAdmission(input: {
  readonly family: string;
  readonly featureKey: string;
  readonly recordedAt: string;
  readonly values: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
  readonly qClose: readonly number[];
  readonly strata?: number;
  readonly q: number;
}): HonestEval<FeatureAdmissionOutcome> {
  const { family, featureKey, recordedAt, values, outcomes, qClose, strata, q } = input;
  if (!family || family.trim().length === 0) {
    return { ok: false, reason: "family required" };
  }
  if (!featureKey || featureKey.trim().length === 0) {
    return { ok: false, reason: "featureKey required" };
  }
  if (
    !Array.isArray(values) ||
    !Array.isArray(outcomes) ||
    !Array.isArray(qClose) ||
    values.length === 0 ||
    values.length !== outcomes.length ||
    values.length !== qClose.length
  ) {
    return {
      ok: false,
      reason: "values/outcomes/qClose must be non-empty and aligned",
    };
  }
  if (!Number.isFinite(q) || q <= 0 || q >= 1) {
    return { ok: false, reason: "q must be finite in (0,1)" };
  }
  try {
    const registry = createTrialsRegistry();
    recordFeatureAdmissionTrial({
      registry,
      family,
      featureKey,
      recordedAt,
      values: values as number[],
      outcomes: outcomes as (0 | 1)[],
      qClose: qClose as number[],
      strata,
    });
    const admissions = decideFamilyAdmissions(registry, family, q);
    const bh = benjaminiHochberg(
      registry.family(family).map((t) => t.pValue),
      q,
    );
    return {
      ok: true,
      data: {
        registry,
        admissions: admissions as FamilyAdmissionsResult,
        bh: bh as BhResult,
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Walk-forward taxonomy source ───────────────────────────────────────────

/**
 * Convert a settled historical pick + pre-game features into a taxonomy row
 * for Mondrian coverage. Returns null when the pick type is not SPREAD/MONEYLINE
 * or the context cannot be derived — that is a documented exclusion, not an
 * imputation.
 */
export function evalTaxonomyRow(input: {
  readonly pick: Parameters<typeof settledHistoricalPickToTaxonomyRow>[0];
  readonly features: Parameters<typeof settledHistoricalPickToTaxonomyRow>[1];
}): HonestEval<ReturnType<typeof settledHistoricalPickToTaxonomyRow>> {
  const { pick, features } = input;
  if (!pick || !features) {
    return { ok: false, reason: "pick and features are required" };
  }
  try {
    const row = settledHistoricalPickToTaxonomyRow(pick, features);
    return { ok: true, data: row };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Derive the real game context from pre-game features. Returns null when
 * the context cannot be derived (e.g. missing moneyline) — never invented.
 */
export function evalGameContext(input: {
  readonly features: Parameters<typeof realGameContextFromPreGame>[0];
  readonly isHomeSelection: boolean;
}): HonestEval<ReturnType<typeof realGameContextFromPreGame>> {
  const { features, isHomeSelection } = input;
  if (!features) {
    return { ok: false, reason: "features required" };
  }
  try {
    const ctx = realGameContextFromPreGame(features, isHomeSelection);
    return { ok: true, data: ctx };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  trainCloseDistiller,
  scoreDistillation,
  predictedMoveEdge,
  createTrialsRegistry,
  recordFeatureAdmissionTrial,
  decideFamilyAdmissions,
  benjaminiHochberg,
  realGameContextFromPreGame,
  settledHistoricalPickToTaxonomyRow,
};
export type {
  CloseRow,
  CloseDistiller,
  DistillationFoldScore,
  TrialsRegistry,
  FamilyAdmissionsResult,
  BhResult,
};
