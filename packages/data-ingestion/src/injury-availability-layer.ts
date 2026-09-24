/**
 * Effective Injury Forecasting in Soccer
 *
 * arXiv:1705.08079v2 · lane:causal_injury · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the NFL injury-forecasting availability layer: replicate the feature-engineering layer
 * exactly -- EWMA (span tuned 4-10) of snap/touch load, ACWR-style acute/chronic ratios on
 * practice participation, monotony of weekly load, prior-injury EWMA -- on NFL practice reports
 * (DNP/limited/full), snap counts, prior-injury history, plus proxy workloads (touches, days since
 * last game, rest days, travel distance, surface type, age, BMI, position); gradient-boosted tree
 * predicting binary injury/designation in the next 1-2 weeks, ADASYN/SMOTE confined to training
 * folds, evaluated by forward weekly simulation 2022-2025; serve weekly injury-risk scores per
 * player as a props-pipeline availability adjustment.
 *
 * ACCEPTANCE GATE: ADOPT iff the model achieves precision >= 0.35 with recall >= 0.50 in the forward weekly
 * simulation on the 2025 test season.
 *
 * Ingest role: feature builder (EWMA/ACWR/monotony injury-risk features -> weekly risk scores).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1705.08079v2" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT iff the model achieves precision >= 0.35 with recall >= 0.50 in the forward weekly
 * simulation on the 2025 test season.`;

export const CONFIG = {
  enabled: false,
  ewmaSpanRange: [4, 10],
  horizonWeeks: 2,
  precisionGate: 0.35,
  recallGate: 0.5,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type PracticeStatus = "DNP" | "limited" | "full";

/** EWMA with span in [4,10] per the paper's feature layer. */
export function ewma(series: readonly number[], span: number): number[] | null {
  if (series.length === 0 || !isFiniteNumber(span) || span < 2) return null;
  if (!series.every(isFiniteNumber)) return null;
  const alpha = 2 / (span + 1);
  const out: number[] = [];
  let prev = series[0] ?? 0;
  out.push(prev);
  for (let i = 1; i < series.length; i++) {
    prev = alpha * (series[i] ?? 0) + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/** ACWR-style acute/chronic ratio (practice participation load). */
export function acwr(acuteLoad: number, chronicLoad: number): number | null {
  if (!isFiniteNumber(acuteLoad) || !isFiniteNumber(chronicLoad)) return null;
  if (acuteLoad < 0 || chronicLoad <= 0) return null;
  return acuteLoad / chronicLoad;
}

/** Monotony = mean / sd of weekly load (paper's feature). */
export function monotony(loads: readonly number[]): number | null {
  if (loads.length < 2 || !loads.every(isFiniteNumber) || loads.some((l) => l < 0)) return null;
  const m = loads.reduce((a, b) => a + b, 0) / loads.length;
  const sd = Math.sqrt(loads.reduce((a, b) => a + (b - m) * (b - m), 0) / loads.length);
  if (sd === 0) return null;
  return m / sd;
}

/** Encode practice participation: DNP=0, limited=0.5, full=1. */
export function practiceLoad(status: PracticeStatus): number {
  return status === "DNP" ? 0 : status === "limited" ? 0.5 : 1;
}

export interface InjuryFeatureRow {
  readonly ewmaLoad: number;
  readonly acwrPractice: number;
  readonly monotonyLoad: number;
  readonly priorInjuryEwma: number;
  readonly daysSinceGame: number;
  readonly restDays: number;
  readonly travelMiles: number;
  readonly age: number;
  readonly bmi: number;
  readonly position: string;
}

export function buildInjuryFeatures(input: {
  snapLoads: readonly number[];
  practice: readonly PracticeStatus[];
  priorInjuries: readonly number[];
  daysSinceGame: number;
  restDays: number;
  travelMiles: number;
  age: number;
  bmi: number;
  position: string;
  ewmaSpan?: number;
}): InjuryFeatureRow | null {
  const span = input.ewmaSpan ?? 7;
  const e = ewma(input.snapLoads, span);
  if (!e) return null;
  if (input.practice.length === 0 || input.priorInjuries.length === 0) return null;
  const pLoads = input.practice.map(practiceLoad);
  const acute = pLoads.slice(-1)[0] ?? 0;
  const chronic = pLoads.reduce((a, b) => a + b, 0) / pLoads.length;
  const ac = acwr(Math.max(acute, 1e-6), Math.max(chronic, 1e-6));
  const mo = monotony(input.snapLoads);
  const pe = ewma(input.priorInjuries, span);
  if (!ac || !mo || !pe) return null;
  const nums = [input.daysSinceGame, input.restDays, input.travelMiles, input.age, input.bmi];
  if (!nums.every(isFiniteNumber) || nums.some((v) => v < 0)) return null;
  return {
    ewmaLoad: e[e.length - 1] ?? 0,
    acwrPractice: ac,
    monotonyLoad: mo,
    priorInjuryEwma: pe[pe.length - 1] ?? 0,
    daysSinceGame: input.daysSinceGame,
    restDays: input.restDays,
    travelMiles: input.travelMiles,
    age: input.age,
    bmi: input.bmi,
    position: input.position,
  };
}
