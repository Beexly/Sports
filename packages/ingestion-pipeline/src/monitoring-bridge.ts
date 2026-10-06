/**
 * Monitoring bridge — wires drift monitoring, ECDD change detection, and
 * Hawkes threat generation into the live health path.
 *
 * This is the "is the model going stale / is something shifting" layer.
 * ECDD is the online change detector; drift-monitor ensembles weekly
 * alarms; Hawkes threat generation models bursty line-move intensity.
 *
 * Fail-closed on missing inputs. Never invents a drift alarm.
 */

import {
  createEcdd,
  ecddUpdate,
  ecddWorstCaseDelay,
  evaluateDrift,
  majorityVote,
  generationOfThreat,
  bootstrapGoT,
  simulateHawkes,
  PageHinkley,
  Pudd,
  type EcddConfig,
  type EcddState,
  type Alarm,
  type DriftEval,
  type HawkesParams,
  type GoTResult,
} from "@sports/prediction-engine";

export type EcddRun =
  | { readonly ok: true; readonly state: EcddState; readonly worstCaseDelay: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Run ECDD over a stream of 0/1 errors (1 = model wrong).
 * Returns the final detector state and the worst-case detection delay.
 */
export function runEcdd(
  errors: readonly (0 | 1)[],
  config?: EcddConfig,
): EcddRun {
  if (!Array.isArray(errors) || errors.length === 0) {
    return { ok: false, reason: "ECDD requires a non-empty error stream" };
  }
  for (let i = 0; i < errors.length; i++) {
    const e = errors[i];
    if (e !== 0 && e !== 1) {
      return { ok: false, reason: `row ${i}: error must be 0|1 — not imputed` };
    }
  }
  try {
    let state = createEcdd(config);
    for (const e of errors) {
      state = ecddUpdate(state, e as 0 | 1, config);
    }
    return {
      ok: true,
      state,
      worstCaseDelay: ecddWorstCaseDelay(config),
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type DriftRun =
  | { readonly ok: true; readonly data: DriftEval; readonly majority: readonly number[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Ensemble drift evaluation: how well the alarm episodes match the true
 * regime-change weeks. Majority vote across detectors is returned alongside.
 */
export function runDriftEnsemble(input: {
  readonly alarms: readonly Alarm[];
  readonly regimeWeeks: readonly number[];
  readonly totalWeeks: number;
  readonly graceWeeks?: number;
  readonly windowWeeks?: number;
}): DriftRun {
  const { alarms, regimeWeeks, totalWeeks, graceWeeks, windowWeeks } = input;
  if (!Array.isArray(alarms) || alarms.length === 0) {
    return { ok: false, reason: "drift ensemble requires at least one alarm" };
  }
  if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) {
    return { ok: false, reason: "totalWeeks must be > 0" };
  }
  try {
    const majority = majorityVote(alarms as Alarm[], windowWeeks);
    const episodes = alarms.map((a) => a.week);
    const data = evaluateDrift(episodes, regimeWeeks as number[], totalWeeks, graceWeeks);
    return { ok: true, data, majority };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type HawkesRun =
  | { readonly ok: true; readonly data: GoTResult }
  | { readonly ok: false; readonly reason: string };

/**
 * Generation-of-threat: Hawkes intensity decomposition of bursty events
 * (line moves, steam, injury news). Fail-closed on invalid params.
 */
export function runHawkesThreat(params: HawkesParams, terms = 50): HawkesRun {
  if (
    !params ||
    !Array.isArray(params.mu) ||
    !Array.isArray(params.alpha) ||
    !Array.isArray(params.beta) ||
    params.mu.length === 0 ||
    params.mu.length !== params.beta.length
  ) {
    return { ok: false, reason: "mu/beta must be non-empty and aligned arrays" };
  }
  for (let i = 0; i < params.mu.length; i++) {
    const m = params.mu[i];
    const b = params.beta[i];
    if (m == null || !Number.isFinite(m) || m < 0) {
      return { ok: false, reason: `mu[${i}] must be finite and >= 0` };
    }
    if (b == null || !Number.isFinite(b) || b <= 0) {
      return { ok: false, reason: `beta[${i}] must be finite and > 0` };
    }
  }
  if (!Number.isFinite(terms) || terms <= 0) {
    return { ok: false, reason: "terms must be > 0" };
  }
  try {
    return { ok: true, data: generationOfThreat(params, terms) };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export {
  createEcdd,
  ecddUpdate,
  ecddWorstCaseDelay,
  evaluateDrift,
  majorityVote,
  generationOfThreat,
  bootstrapGoT,
  simulateHawkes,
  PageHinkley,
  Pudd,
};
export type { EcddState, EcddConfig, Alarm, DriftEval, HawkesParams, GoTResult };

export type DetectorAlarmRun =
  | { readonly ok: true; readonly alarms: readonly boolean[]; readonly fired: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Page-Hinkley detector as a live alarm producer over weekly Brier values.
 * Fail-closed on empty or non-finite streams.
 */
export function runPageHinkley(
  weeklyBrier: readonly number[],
  delta?: number,
  threshold?: number,
): DetectorAlarmRun {
  if (!Array.isArray(weeklyBrier) || weeklyBrier.length === 0) {
    return { ok: false, reason: "PageHinkley requires a non-empty Brier stream" };
  }
  for (let i = 0; i < weeklyBrier.length; i++) {
    const x = weeklyBrier[i];
    if (x == null || !Number.isFinite(x)) {
      return { ok: false, reason: `row ${i}: Brier must be finite — not imputed` };
    }
  }
  try {
    const det = new PageHinkley(delta, threshold);
    const alarms = weeklyBrier.map((x) => det.update(x));
    return { ok: true, alarms, fired: alarms.filter(Boolean).length };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * PUDD detector as a live alarm producer over weekly (uncertain, total) counts.
 * Fail-closed on invalid counts. Missing weeks are not imputed.
 */
export function runPudd(
  weeks: readonly { readonly uncertain: number; readonly total: number }[],
  refWeeks?: number,
  recentWeeks?: number,
  zThreshold?: number,
): DetectorAlarmRun {
  if (!Array.isArray(weeks) || weeks.length === 0) {
    return { ok: false, reason: "PUDD requires a non-empty weekly count stream" };
  }
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    if (
      w == null ||
      !Number.isFinite(w.uncertain) ||
      !Number.isFinite(w.total) ||
      w.total <= 0 ||
      w.uncertain < 0 ||
      w.uncertain > w.total
    ) {
      return {
        ok: false,
        reason: `row ${i}: 0 <= uncertain <= total, total > 0 — not imputed`,
      };
    }
  }
  try {
    const det = new Pudd(refWeeks, recentWeeks, zThreshold);
    const alarms = weeks.map((w) => det.update(w.uncertain, w.total));
    return { ok: true, alarms, fired: alarms.filter(Boolean).length };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type HawkesBootstrapRun =
  | { readonly ok: true; readonly mean: readonly number[]; readonly se: readonly number[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Bootstrap GoT parameter uncertainty. Fail-closed on invalid params or nBoot.
 */
export function evalBootstrapGoT(
  params: HawkesParams,
  T: number,
  nBoot: number,
  rand: () => number = Math.random,
): HawkesBootstrapRun {
  if (
    !params ||
    !Array.isArray(params.mu) ||
    !Array.isArray(params.alpha) ||
    !Array.isArray(params.beta) ||
    params.mu.length === 0 ||
    params.mu.length !== params.beta.length
  ) {
    return { ok: false, reason: "mu/beta must be non-empty and aligned arrays" };
  }
  if (!Number.isFinite(T) || T <= 0) {
    return { ok: false, reason: "T must be finite and > 0" };
  }
  if (!Number.isFinite(nBoot) || nBoot < 2) {
    return { ok: false, reason: "nBoot must be >= 2" };
  }
  try {
    const r = bootstrapGoT(params, T, nBoot, rand);
    return { ok: true, mean: r.mean, se: r.se };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type HawkesSimulateRun =
  | { readonly ok: true; readonly events: readonly [number, number][] }
  | { readonly ok: false; readonly reason: string };

/**
 * Simulate a multivariate Hawkes path. Fail-closed on invalid params.
 */
export function evalSimulateHawkes(
  params: HawkesParams,
  T: number,
  rand: () => number = Math.random,
): HawkesSimulateRun {
  if (
    !params ||
    !Array.isArray(params.mu) ||
    !Array.isArray(params.alpha) ||
    !Array.isArray(params.beta) ||
    params.mu.length === 0 ||
    params.mu.length !== params.beta.length
  ) {
    return { ok: false, reason: "mu/beta must be non-empty and aligned arrays" };
  }
  if (!Number.isFinite(T) || T <= 0) {
    return { ok: false, reason: "T must be finite and > 0" };
  }
  try {
    const events = simulateHawkes(params, T, rand);
    return { ok: true, events };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
