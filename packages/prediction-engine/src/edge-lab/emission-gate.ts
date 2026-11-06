/**
 * TRANSPARENT EMISSION GATE — deterministic, auditable emission arbitration
 * (work order `motif-to-hermes-emission-gate-build-2026-10-16.md`, Phase 1, item 2).
 *
 * WHY THIS EXISTS: the emission/promotion judge seat is vacant. This gate fills
 * it with code, not a model: every emission decision is reproducible from its
 * logged inputs (which signals fired, what the calibrated weights said, what the
 * market/CLV disagreement was, which threshold ruled). No opaque judge. The only
 * learned component is the calibrated weight vector, which is fitted by the
 * harness (`emission-gate-harness.ts` logistic stacking) and logged here in full.
 *
 * DOCTRINE (verbatim from the work order):
 *  - Ingestion is universal and ungated. This gate rules EMISSION ONLY. It may
 *    never filter, rank-down, or hide what the engine is allowed to know; a
 *    refused emission keeps its refusal as a status inside the engine.
 *  - Arbitration is measured evidence only: calibration, CLV, walk-forward. No
 *    vendor numbers anywhere.
 *  - Deterministic and auditable. No opaque judge.
 *  - Gates keep their one jurisdiction: emission and promotion to publication.
 *
 * THE DECISION FLOW (per the work order, in order):
 *   calibrated stacking/weights over base signals
 *     -> market-prior combination (devigged close as strongest prior)
 *     -> market/CLV disagreement term
 *     -> selective risk threshold (emit / withhold / abstain)
 *     -> existing duplication check
 *     -> the correlated-simulation layer's p90/p99 + ceiling-EV outputs
 *        feeding the threshold
 *
 * Selective-risk semantics (train/optimize with `optimizeSelectiveThreshold`):
 *   Emit  = the calibrated model beats the devigged market prior by more than
 *           the selective risk threshold (the gate's one tunable), after the
 *           market/CLV disagreement penalty, with the simulation tail inside
 *           bands (p99 ceiling-EV > -0.05u) and no duplication.
 *   Abstain = within `abstainBand` of the threshold (default 0.01) or missing
 *           calibration evidence — evidence-absent abstains, never emits.
 *   Withhold = below the band, or blocked by any hard block (duplication,
 *           simulation tail breach, non-finite inputs).
 *
 * Pure, deterministic, no I/O, no clock, no randomness. Same inputs in, same
 * decision out, with the full trail attached.
 */

import { proportionalDevig, shinDevig, type ShinResult } from "./devig.js";

/** The decision the gate reached, with the trail needed to reproduce it. */
export type EmissionDecision = "emit" | "abstain" | "withhold";

/** How the decision was reached — one `rule` id, never more than one. */
export type EmissionRule =
  /** Stacking beat the market prior past the threshold, all blocks clear. */
  | "selective_risk_emit"
  /** Inside the abstain band around the threshold — deferred by construction. */
  | "abstain_band"
  /** Evidence-absent (no calibrated weights, no market price, no outcome
   * probabilities) — abstains, never emits. Absence is silence, and silence
   * does not emit. */
  | "abstain_missing_evidence"
  /** Below the band and not blocked: a soft no — keeps its status in the engine. */
  | "withhold_below_threshold"
  /** A candidate duplicate was detected (same game + market + selection). */
  | "withhold_duplicate"
  /** The simulation tail breached the bands (p99 ceiling-EV below the floor). */
  | "withhold_simulation_tail"
  /** Model p and market p disagree structurally (no finite combination). */
  | "withhold_incoherent_inputs";

/** The status a refused emission keeps inside the engine (doctrine: a refusal
 * is a status, not a deletion). */
export type EmissionStatus = "emitted" | "abstained" | "withheld";

export interface GateSignals {
  /** Base signals over the candidate, all in [0,1] (calibrated model
   * probabilities per source/market). Keys are source names. */
  readonly baseSignals: Readonly<Record<string, number>>;
  /** Calibrated weights fitted by the harness (logistic stacking). Absent =
   * evidence-absent -> abstain. Logged in the decision trail. */
  readonly calibratedWeights?: Readonly<Record<string, number>>;
  /** The devigged market-close probability of the selected outcome. */
  readonly marketCloseProb?: number;
  /** Raw (pre-devig) decimal prices for the market, in book outcome order,
   * with the selected outcome's index — the gate devigs internally so the
   * choice of routine is logged, not assumed. */
  readonly decimalPrices?: readonly number[];
  /** Index of the selected outcome within `decimalPrices`. */
  readonly selectedOutcomeIndex?: number;
  /** De-vig routine to use when `decimalPrices` are supplied. Default
   * `proportional` (house default); `shin` corrects favourite-longshot bias. */
  readonly devigRoutine?: "proportional" | "shin";
  /** CLV disagreement term: measured close-vs-current line movement against
   * the candidate (units). Absent = no CLV evidence (term = 0, logged). */
  readonly clvDisagreement?: number;
  /** The engine's own duplication check result (same game + market +
   * selection already emitted?). Present-and-true = hard block. */
  readonly duplicateOf?: string | null;
  /** The correlated-simulation layer's tail outputs (units). Optional —
   * absent means the simulation layer has not run (logged as such). */
  readonly simulation?: {
    readonly p90?: number;
    readonly p99?: number;
    readonly ceilingEv?: number;
  };
}

/** One reproducible line of the decision trail. */
export interface GateTrailLine {
  readonly step: string;
  readonly detail: string;
}

export interface EmissionGateInputs {
  /** Stable candidate identity: game key + market + selection. The
   * duplication check keys on exactly this triple. */
  readonly gameKey: string;
  readonly market: string;
  readonly selection: string;
  readonly signals: GateSignals;
  /** Threshold calibration (fitted by `optimizeSelectiveThreshold`).
   * Defaults to the pre-registered starting threshold 0.03. */
  readonly threshold?: number;
  readonly abstainBand?: number;
}

export interface EmissionGateResult {
  readonly decision: EmissionDecision;
  readonly status: EmissionStatus;
  readonly rule: EmissionRule;
  /** The selective-risk statistic: stacking p minus the disagreement-penalized
   * market prior. The threshold compares against THIS. */
  readonly selectiveRisk: number;
  /** Calibrated stacking probability p_model. */
  readonly modelProb: number;
  /** Devigged market prior used (null = none supplied). */
  readonly marketPrior: number | null;
  /** The disagreement term actually applied (units, scaled). */
  readonly disagreementTerm: number;
  /** Duplicate detected? */
  readonly duplicate: boolean;
  /** Simulation tail verdict, when simulation outputs were supplied. */
  readonly tailVerdict: "ok" | "breach" | "not_run";
  /** Full reproducible trail — every step, in order. */
  readonly trail: readonly GateTrailLine[];
}

/** Pre-registered starting threshold (units of calibrated edge over the
 * market prior). The harness optimizes this on the calibration split only. */
export const DEFAULT_THRESHOLD = 0.03;

/** Abstain band half-width. */
export const DEFAULT_ABSTAIN_BAND = 0.01;

/** Simulation tail floor: p99 ceiling-EV below this (units) is a breach. */
export const SIM_TAIL_FLOOR = -0.05;

/** Scale for the disagreement term: 1 unit of CLV disagreement moves the
 * effective prior by 0.05 probability mass (pre-registered constant). */
export const DISAGREEMENT_SCALE = 0.05;

function finite(x: number | undefined | null): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Logistic for stacking probabilities. Guarded against overflow. */
function logistic(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** Deterministic logistic stacking of base signals under calibrated weights.
 * Signals absent from the weight map get no vote (weights are per-signal);
 * a signal with zero weight contributes zero logits. Returns NaN when no
 * signal carries a nonzero finite weight. */
export function stackingProb(
  baseSignals: Readonly<Record<string, number>>,
  calibratedWeights: Readonly<Record<string, number>> | undefined,
): number {
  if (!calibratedWeights) return NaN;
  let z = 0;
  let votes = 0;
  for (const [name, w] of Object.entries(calibratedWeights)) {
    const s = baseSignals[name];
    if (!finite(s)) continue;
    if (!finite(w) || w === 0) continue;
    z += w * (s - 0.5);
    votes += 1;
  }
  if (votes === 0) return NaN;
  return logistic(z);
}

/** Devig the market price vector, honouring the requested routine, and return
 * the selected outcome's fair probability. Null when the book is not honestly
 * priceable (crossed/stale — same guard as devig.ts). */
export function marketPriorFrom(
  decimalPrices: readonly number[] | undefined,
  selectedOutcomeIndex: number | undefined,
  routine: "proportional" | "shin",
): number | null {
  if (!decimalPrices || !finite(selectedOutcomeIndex)) return null;
  const idx = selectedOutcomeIndex as number;
  if (idx < 0 || idx >= decimalPrices.length) return null;
  if (routine === "shin") {
    const shin: ShinResult | null = shinDevig(decimalPrices);
    if (!shin) return null;
    const p = shin.probs[idx];
    return finite(p) ? p : null;
  }
  const probs = proportionalDevig(decimalPrices);
  if (!probs) return null;
  const p = probs[idx];
  return finite(p) ? p : null;
}

/**
 * Evaluate the gate for one candidate. Deterministic; throws on nothing —
 * every malformed input routes to an honest refusal with its trail, never a
 * fabricated emit.
 */
export function evaluateEmissionGate(
  inputs: EmissionGateInputs,
): EmissionGateResult {
  const { gameKey, market, selection, signals } = inputs;
  const threshold = finite(inputs.threshold) ? (inputs.threshold as number) : DEFAULT_THRESHOLD;
  const band = finite(inputs.abstainBand) ? (inputs.abstainBand as number) : DEFAULT_ABSTAIN_BAND;
  const trail: GateTrailLine[] = [];

  trail.push({
    step: "identity",
    detail: `game=${gameKey} market=${market} selection=${selection}`,
  });

  // ---- Hard block 1: duplication (the existing check, upstream). ----
  const duplicate = signals.duplicateOf != null && signals.duplicateOf !== "";
  if (duplicate) {
    trail.push({
      step: "duplication",
      detail: `duplicate of ${signals.duplicateOf} (same game+market+selection)`,
    });
    return {
      decision: "withhold",
      status: "withheld",
      rule: "withhold_duplicate",
      selectiveRisk: NaN,
      modelProb: NaN,
      marketPrior: null,
      disagreementTerm: NaN,
      duplicate: true,
      tailVerdict: "not_run",
      trail,
    };
  }
  trail.push({ step: "duplication", detail: "clear" });

  // ---- Calibrated stacking over base signals. ----
  const modelProb = stackingProb(signals.baseSignals, signals.calibratedWeights);
  if (finite(modelProb)) {
    trail.push({ step: "stacking", detail: `p_model=${modelProb.toFixed(6)} from base signals under calibrated weights` });
  } else {
    trail.push({ step: "stacking", detail: "no calibrated weights / no weighted signals -> p_model unavailable" });
  }

  // ---- Market prior (devigged close as strongest prior). ----
  let marketPrior: number | null = null;
  if (finite(signals.marketCloseProb)) {
    marketPrior = signals.marketCloseProb as number;
    trail.push({ step: "market_prior", detail: `supplied devigged close p=${marketPrior.toFixed(6)}` });
  } else if (signals.decimalPrices) {
    const routine = signals.devigRoutine ?? "proportional";
    marketPrior = marketPriorFrom(signals.decimalPrices, signals.selectedOutcomeIndex, routine);
    trail.push({
      step: "market_prior",
      detail: marketPrior == null
        ? `devig(${routine}) refused the book (crossed/stale) -> no prior`
        : `devig(${routine}) p=${marketPrior.toFixed(6)}`,
    });
  } else {
    trail.push({ step: "market_prior", detail: "no market price evidence supplied" });
  }

  // ---- Market/CLV disagreement term. ----
  const clv = finite(signals.clvDisagreement) ? (signals.clvDisagreement as number) : 0;
  const disagreementTerm = clv * DISAGREEMENT_SCALE;
  trail.push({
    step: "disagreement",
    detail: `clvDisagreement=${clv.toFixed(4)}u x ${DISAGREEMENT_SCALE} -> ${disagreementTerm.toFixed(6)}`,
  });

  // ---- Evidence-absent rule: no model p, no market p -> abstain. ----
  if (!finite(modelProb) || marketPrior == null) {
    trail.push({
      step: "rule",
      detail: !finite(modelProb)
        ? "model probability unavailable -> abstain (absence is silence; silence does not emit)"
        : "market prior unavailable -> abstain",
    });
    return {
      decision: "abstain",
      status: "abstained",
      rule: "abstain_missing_evidence",
      selectiveRisk: NaN,
      modelProb: finite(modelProb) ? modelProb : NaN,
      marketPrior,
      disagreementTerm,
      duplicate: false,
      tailVerdict: "not_run",
      trail,
    };
  }

  // ---- Simulation tail (when the layer has run). ----
  let tailVerdict: EmissionGateResult["tailVerdict"] = "not_run";
  if (signals.simulation) {
    const p99 = signals.simulation.p99;
    const ceiling = signals.simulation.ceilingEv;
    if (finite(p99) && finite(ceiling)) {
      tailVerdict = ceiling < SIM_TAIL_FLOOR ? "breach" : "ok";
      trail.push({
        step: "simulation_tail",
        detail: `p99=${(p99 as number).toFixed(4)} ceilingEv=${(ceiling as number).toFixed(4)}u -> ${tailVerdict} (floor ${SIM_TAIL_FLOOR})`,
      });
    } else {
      trail.push({ step: "simulation_tail", detail: "simulation outputs present but non-finite -> treated as not_run" });
    }
  } else {
    trail.push({ step: "simulation_tail", detail: "simulation layer has not run for this candidate -> not_run" });
  }

  // ---- Selective risk: model edge over the disagreement-penalized prior. ----
  const effectivePrior = marketPrior + disagreementTerm;
  const selectiveRisk = modelProb - effectivePrior;
  trail.push({
    step: "selective_risk",
    detail: `p_model ${modelProb.toFixed(6)} - effective_prior ${effectivePrior.toFixed(6)} = ${selectiveRisk.toFixed(6)} vs threshold ${threshold} (band ±${band})`,
  });

  // ---- Hard block 2: simulation tail breach. ----
  if (tailVerdict === "breach") {
    trail.push({ step: "rule", detail: "simulation tail breached -> withhold" });
    return {
      decision: "withhold",
      status: "withheld",
      rule: "withhold_simulation_tail",
      selectiveRisk,
      modelProb,
      marketPrior,
      disagreementTerm,
      duplicate: false,
      tailVerdict,
      trail,
    };
  }

  // ---- Selective risk threshold with abstain band. ----
  if (selectiveRisk > threshold + band) {
    trail.push({ step: "rule", detail: "selective risk above threshold + band -> emit" });
    return {
      decision: "emit",
      status: "emitted",
      rule: "selective_risk_emit",
      selectiveRisk,
      modelProb,
      marketPrior,
      disagreementTerm,
      duplicate: false,
      tailVerdict,
      trail,
    };
  }
  if (selectiveRisk >= threshold - band) {
    trail.push({ step: "rule", detail: "selective risk inside abstain band -> abstain" });
    return {
      decision: "abstain",
      status: "abstained",
      rule: "abstain_band",
      selectiveRisk,
      modelProb,
      marketPrior,
      disagreementTerm,
      duplicate: false,
      tailVerdict,
      trail,
    };
  }
  trail.push({ step: "rule", detail: "selective risk below the band -> withhold (soft no; keeps its status in the engine)" });
  return {
    decision: "withhold",
    status: "withheld",
    rule: "withhold_below_threshold",
    selectiveRisk,
    modelProb,
    marketPrior,
    disagreementTerm,
    duplicate: false,
    tailVerdict,
    trail,
  };
}

/** Is this result an emission (vs. any refusal)? */
export function isEmission(r: EmissionGateResult): boolean {
  return r.decision === "emit";
}
