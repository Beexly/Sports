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
import {
  AsOfFeatureStore,
  AsOfViolationError,
  evVsClose,
  walkForwardEval,
  edgeLabShuffledTimePlacebo,
  conditionalMiProbe,
  measureSeparationAgainstNgs,
  measureExpectedAgainstNgs,
  scanLadderBoost,
  scanBoostOpportunities,
  type FeatureObservation,
  type ServedRecord,
  type PlaceboEvalRow,
  type PlaceboEvalReport,
  type PlaceboOptions,
  type EdgeLabPlaceboReport,
  type MiProbeReport,
  type WalkForwardOptions,
  type SepPrediction,
  type SepTruth,
  type SepMeasurement,
  type ExpectedFamily,
  type ExpectedMeasurement,
  type PlayerExpectedMetric,
  type GroundTruthPoint,
  type LadderLevel,
  type SoftnessMapResult,
  type SoftnessMapOptions,
  type BoostOpportunity,
} from "@sports/prediction-engine";

/** Trainer shape required by edge-lab placebo / walk-forward eval. */
type EdgeLabTrainer = (
  train: readonly { readonly features: ReadonlyMap<string, number>; readonly y: 0 | 1 }[],
) => (features: ReadonlyMap<string, number>) => number;

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

// ── As-of feature store (leak wall) ─────────────────────────────────────────

/**
 * Ingest one feature observation into an as-of store.
 * Rejects closing-line keys unless explicitly allowlisted. Fail-closed.
 */
export function evalAsofIngest(input: {
  readonly store: AsOfFeatureStore;
  readonly observation: FeatureObservation;
  readonly marketDecisionKeys?: readonly string[];
}): HonestEval<{ readonly ok: true }> {
  const { store, observation } = input;
  if (!store || !observation) {
    return { ok: false, reason: "store and observation are required — not imputed" };
  }
  try {
    store.ingest(observation, {
      marketDecisionKeys: input.marketDecisionKeys,
    });
    return { ok: true, data: { ok: true } };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Read the latest observation knowable at `asOf`. Missing -> fail-closed
 * (never invents a value). The store records the read in servedAudit.
 */
export function evalAsofGet(input: {
  readonly store: AsOfFeatureStore;
  readonly entityId: string;
  readonly featureKey: string;
  readonly asOf: string;
}): HonestEval<FeatureObservation> {
  const { store, entityId, featureKey, asOf } = input;
  if (!store || !entityId || !featureKey || !asOf) {
    return { ok: false, reason: "store, entityId, featureKey, asOf are required" };
  }
  try {
    const obs = store.get(entityId, featureKey, asOf);
    if (!obs) {
      return {
        ok: false,
        reason: `no observation for ${entityId}/${featureKey} knowable at ${asOf} — not imputed`,
      };
    }
    return { ok: true, data: obs };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Tripwire: throws (via HonestEval) when any served read postdates its cutoff.
 * A clean store returns ok:true with the served-audit length.
 */
export function evalAsofNoLookahead(input: {
  readonly store: AsOfFeatureStore;
}): HonestEval<{ readonly servedCount: number }> {
  const { store } = input;
  if (!store) {
    return { ok: false, reason: "store is required" };
  }
  try {
    store.assertNoLookahead();
    return { ok: true, data: { servedCount: store.servedAudit.length } };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Placebo / walk-forward eval ─────────────────────────────────────────────

/**
 * Walk-forward train/test evaluation of EV-vs-close on fired plays.
 * Fail-closed on missing rows/trainer. Never invents a return.
 */
export function evalWalkForward(input: {
  readonly rows: readonly PlaceboEvalRow[];
  readonly trainer: EdgeLabTrainer;
  readonly walkForward: WalkForwardOptions;
  readonly fireThreshold: number;
}): HonestEval<PlaceboEvalReport> {
  const { rows, trainer, walkForward, fireThreshold } = input;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "rows empty — not imputed" };
  }
  if (typeof trainer !== "function") {
    return { ok: false, reason: "trainer must be a function" };
  }
  if (!Number.isFinite(fireThreshold)) {
    return { ok: false, reason: "fireThreshold must be finite" };
  }
  try {
    const report = walkForwardEval(rows, trainer, walkForward, fireThreshold);
    return { ok: true, data: report };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Shuffled-time placebo: scramble feature times and re-score. A real edge
 * must survive; a leak shows up as placebo EV comparable to live EV.
 * Distinct from honesty/placebo-leak's runShuffledTimePlacebo.
 */
export function evalEdgeLabPlacebo(input: {
  readonly store: AsOfFeatureStore;
  readonly rows: readonly PlaceboEvalRow[];
  readonly trainer: EdgeLabTrainer;
  readonly options: PlaceboOptions;
}): HonestEval<EdgeLabPlaceboReport> {
  const { store, rows, trainer, options } = input;
  if (!store) return { ok: false, reason: "store is required" };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "rows empty — not imputed" };
  }
  if (typeof trainer !== "function") {
    return { ok: false, reason: "trainer must be a function" };
  }
  try {
    const report = edgeLabShuffledTimePlacebo(store, rows, trainer, options);
    return { ok: true, data: report };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Conditional MI probe: I(score; Y | q_close). High MI with q_close held
 * fixed is evidence the score carries outcome information the close lacks.
 */
export function evalConditionalMiProbe(input: {
  readonly scores: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
  readonly qClose: readonly number[];
  readonly strata?: number;
  readonly scoreBins?: number;
  readonly permutations?: number;
  readonly seed?: number;
}): HonestEval<MiProbeReport> {
  const { scores, outcomes, qClose } = input;
  if (
    !Array.isArray(scores) ||
    !Array.isArray(outcomes) ||
    !Array.isArray(qClose) ||
    scores.length === 0 ||
    scores.length !== outcomes.length ||
    scores.length !== qClose.length
  ) {
    return {
      ok: false,
      reason: "scores/outcomes/qClose must be equal-length non-empty arrays — not imputed",
    };
  }
  try {
    const report = conditionalMiProbe({
      scores,
      outcomes,
      qClose,
      strata: input.strata,
      scoreBins: input.scoreBins,
      permutations: input.permutations,
      seed: input.seed,
    });
    return { ok: true, data: report };
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
  evVsClose,
  walkForwardEval,
  edgeLabShuffledTimePlacebo,
  conditionalMiProbe,
  AsOfFeatureStore,
  AsOfViolationError,
  measureSeparationAgainstNgs,
  measureExpectedAgainstNgs,
  scanLadderBoost,
  scanBoostOpportunities,
};
export type {
  CloseRow,
  CloseDistiller,
  DistillationFoldScore,
  TrialsRegistry,
  FamilyAdmissionsResult,
  BhResult,
  FeatureObservation,
  ServedRecord,
  PlaceboEvalRow,
  PlaceboEvalReport,
  PlaceboOptions,
  EdgeLabPlaceboReport,
  MiProbeReport,
  WalkForwardOptions,
  SepPrediction,
  SepTruth,
  SepMeasurement,
  ExpectedFamily,
  ExpectedMeasurement,
  PlayerExpectedMetric,
  GroundTruthPoint,
  LadderLevel,
  SoftnessMapResult,
  SoftnessMapOptions,
  BoostOpportunity,
};

// ── NGS measurement loop (reconstruction vs NGS truth, never a live p) ──────

/**
 * Inner-join our separation reconstruction to NGS actuals by playerId.
 * Measurement only — never copies NGS into a served metric.
 */
export function evalNgsSeparation(input: {
  readonly predicted: readonly SepPrediction[];
  readonly truth: readonly SepTruth[];
}): HonestEval<SepMeasurement> {
  const { predicted, truth } = input;
  if (!Array.isArray(predicted) || !Array.isArray(truth)) {
    return { ok: false, reason: "predicted/truth must be arrays — not imputed" };
  }
  if (predicted.length === 0 || truth.length === 0) {
    return { ok: false, reason: "predicted/truth empty — not imputed" };
  }
  try {
    const m = measureSeparationAgainstNgs(predicted, truth);
    if (!m.ok) {
      return { ok: false, reason: `NGS separation measurement refused: ${m.refuse} (n=${m.n})` };
    }
    return { ok: true, data: m };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Measure our expected-metric family (cpoe | ryoe | xyac) against NGS truth.
 */
export function evalNgsExpected(input: {
  readonly family: ExpectedFamily;
  readonly ours: readonly PlayerExpectedMetric[];
  readonly truth: readonly GroundTruthPoint[];
}): HonestEval<ExpectedMeasurement> {
  const { family, ours, truth } = input;
  if (family !== "cpoe" && family !== "ryoe" && family !== "xyac") {
    return { ok: false, reason: "family must be cpoe | ryoe | xyac" };
  }
  if (!Array.isArray(ours) || !Array.isArray(truth)) {
    return { ok: false, reason: "ours/truth must be arrays — not imputed" };
  }
  if (ours.length === 0 || truth.length === 0) {
    return { ok: false, reason: "ours/truth empty — not imputed" };
  }
  try {
    const m = measureExpectedAgainstNgs(family, ours, truth);
    if (!m.ok) {
      return { ok: false, reason: `NGS expected measurement refused: ${m.refuse} (n=${m.n})` };
    }
    return { ok: true, data: m };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Ladder / boost scanners (market softness across a line ladder) ──────────

/**
 * Scan a posted ladder for the softest level vs the model.
 * Requires a real modelPOver(line) curve — no interpolation, no invention.
 */
export function evalLadderBoost(input: {
  readonly levels: readonly LadderLevel[];
  readonly modelPOver: (line: number) => number;
  readonly options?: SoftnessMapOptions;
}): HonestEval<SoftnessMapResult> {
  const { levels, modelPOver } = input;
  if (!Array.isArray(levels) || levels.length === 0) {
    return { ok: false, reason: "levels empty — not imputed" };
  }
  if (typeof modelPOver !== "function") {
    return { ok: false, reason: "modelPOver must be a function of line" };
  }
  try {
    const result = scanLadderBoost(levels, modelPOver, input.options ?? {});
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Positive-edge boost opportunities across the ladder.
 */
export function evalBoostOpportunities(input: {
  readonly levels: readonly LadderLevel[];
  readonly modelPOver: (line: number) => number;
  readonly options?: SoftnessMapOptions;
}): HonestEval<readonly BoostOpportunity[]> {
  const { levels, modelPOver } = input;
  if (!Array.isArray(levels) || levels.length === 0) {
    return { ok: false, reason: "levels empty — not imputed" };
  }
  if (typeof modelPOver !== "function") {
    return { ok: false, reason: "modelPOver must be a function of line" };
  }
  try {
    const opps = scanBoostOpportunities(levels, modelPOver, input.options ?? {});
    return { ok: true, data: opps };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
