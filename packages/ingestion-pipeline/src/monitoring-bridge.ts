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
};
export type { EcddState, EcddConfig, Alarm, DriftEval, HawkesParams, GoTResult };
