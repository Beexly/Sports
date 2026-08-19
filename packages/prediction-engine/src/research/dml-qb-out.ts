/**
 * R-10 Double ML prototype — QB out/limited, NFL-shaped panel, shadow only.
 *
 * Chernozhukov et al. (2018) IRM/AIPW. Nuisances are L2-logistic (the
 * in-repo equivalent — no XGBoost package, AGENTS.md forbids installing).
 * 5-fold time-aware cross-fitting: each fold's nuisances train only on
 * strictly earlier weeks. Never a pick input, never a public claim.
 *
 * SUTVA is violated in sports (game-script interference). That limit is
 * reported in RESULTS.md rather than pretended away.
 *
 * Filter comparison: TeamIntervention is a caller-supplied delta with
 * default interventionGain = 1; this repo does not ship a canonical
 * QB-out delta. We convert DML ATT (win-prob) to an implied logit shift
 * so a human can compare it to whatever delta they would have passed.
 */

import { type DmlGameRow, timeIndex } from "./dml-panel.js";

export const TRIM_LOW = 0.05;
export const TRIM_HIGH = 0.95;
export const N_FOLDS = 5;
export const FILTER_INTERVENTION_GAIN = 1; // team-strength-filter.ts default

export interface DmlEstimate {
  readonly att: number;
  readonly se: number;
  readonly ciLow: number;
  readonly ciHigh: number;
  readonly n: number;
  readonly nTreated: number;
  readonly nTrimmed: number;
  readonly meanPropensity: number;
  readonly minPropensity: number;
  readonly maxPropensity: number;
  readonly impliedLogitShift: number;
  readonly filterGain: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface DmlDiagnostics {
  readonly estimate: DmlEstimate;
  readonly placeboAtt: number;
  readonly placeboCiLow: number;
  readonly placeboCiHigh: number;
  readonly placeboContainsZero: boolean;
  readonly overlapTrimmedFrac: number;
  readonly sensitivityGamma: number;
  readonly sensitivityInterval: readonly [number, number];
  readonly sutvaNote: string;
}

const SUTVA =
  "SUTVA is violated in sports: one team's QB-out changes opponent game script, so units interfere. ATT is a statistical association under the design, not a ceteris-paribus causal effect.";

function sigmoid(z: number): number {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

/** Features: intercept, rest, travel, strength, strengthVar, oppStrength. */
const F = 6;

function fillX(row: DmlGameRow, out: Float64Array): void {
  out[0] = 1;
  out[1] = (row.restDays - 6) / 4;
  out[2] = (row.travelKm - 1500) / 1500;
  out[3] = row.strengthMean;
  out[4] = row.strengthVar;
  out[5] = row.opponentStrength;
}

/** Ridge logistic via Newton. y in {0,1}. Returns weights length dim. */
function fitLogistic(
  rows: readonly DmlGameRow[],
  y: (r: DmlGameRow) => number,
  dim: number,
  xOf: (r: DmlGameRow, out: Float64Array) => void,
): Float64Array {
  const beta = new Float64Array(dim);
  const x = new Float64Array(dim);
  const g = new Float64Array(dim);
  const h = new Float64Array(dim * dim);
  const step = new Float64Array(dim);
  const ridge = 1;
  for (let iter = 0; iter < 8; iter++) {
    g.fill(0);
    h.fill(0);
    for (let d = 0; d < dim; d++) h[d * dim + d] = -ridge;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      xOf(r, x);
      let eta = 0;
      for (let d = 0; d < dim; d++) eta += x[d]! * beta[d]!;
      const p = sigmoid(eta);
      const yi = y(r);
      const w = p * (1 - p);
      for (let a = 0; a < dim; a++) {
        g[a] = g[a]! + (yi - p) * x[a]!;
        for (let b = 0; b < dim; b++) h[a * dim + b] = h[a * dim + b]! - w * x[a]! * x[b]!;
      }
    }
    if (!solve(h, g, step, dim)) break;
    let ok = true;
    for (let d = 0; d < dim; d++) {
      const n = beta[d]! - step[d]!;
      if (!Number.isFinite(n)) {
        ok = false;
        break;
      }
      beta[d] = n;
    }
    if (!ok) break;
  }
  return beta;
}

function solve(h: Float64Array, g: Float64Array, out: Float64Array, n: number): boolean {
  const a = new Float64Array(n * (n + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) a[i * (n + 1) + j] = h[i * n + j]!;
    a[i * (n + 1) + n] = g[i]!;
  }
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = Math.abs(a[col * (n + 1) + col]!);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(a[r * (n + 1) + col]!);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (!(best > 1e-12)) return false;
    if (piv !== col) {
      for (let j = col; j <= n; j++) {
        const tmp = a[col * (n + 1) + j]!;
        a[col * (n + 1) + j] = a[piv * (n + 1) + j]!;
        a[piv * (n + 1) + j] = tmp;
      }
    }
    const diag = a[col * (n + 1) + col]!;
    for (let r = col + 1; r < n; r++) {
      const f = a[r * (n + 1) + col]! / diag;
      for (let j = col; j <= n; j++) a[r * (n + 1) + j] = a[r * (n + 1) + j]! - f * a[col * (n + 1) + j]!;
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = a[i * (n + 1) + n]!;
    for (let j = i + 1; j < n; j++) s -= a[i * (n + 1) + j]! * out[j]!;
    const diag = a[i * (n + 1) + i]!;
    if (!(Math.abs(diag) > 1e-12)) return false;
    out[i] = s / diag;
    if (!Number.isFinite(out[i]!)) return false;
  }
  return true;
}

function predict(beta: Float64Array, x: Float64Array): number {
  let eta = 0;
  for (let d = 0; d < beta.length; d++) eta += beta[d]! * x[d]!;
  return sigmoid(eta);
}

function timeFolds(rows: readonly DmlGameRow[]): DmlGameRow[][] {
  const sorted = rows.slice().sort((a, b) => timeIndex(a) - timeIndex(b) || a.team - b.team);
  const folds: DmlGameRow[][] = Array.from({ length: N_FOLDS }, () => []);
  const n = sorted.length;
  for (let i = 0; i < n; i++) {
    const k = Math.min(N_FOLDS - 1, Math.floor((i * N_FOLDS) / n));
    folds[k]!.push(sorted[i]!);
  }
  return folds;
}

function xProp(r: DmlGameRow, out: Float64Array): void {
  fillX(r, out);
}

interface Nuisance {
  readonly eBeta: Float64Array;
  readonly gBeta: Float64Array; // dim F+1, last is T
}

function fitNuisance(train: readonly DmlGameRow[]): Nuisance {
  const eBeta = fitLogistic(train, (r) => r.treatment, F, xProp);
  const gBeta = fitLogistic(
    train,
    (r) => r.win,
    F + 1,
    (r, out) => {
      fillX(r, out);
      out[F] = r.treatment;
    },
  );
  return { eBeta, gBeta };
}

function gHat(nui: Nuisance, row: DmlGameRow, t: 0 | 1): number {
  const x = new Float64Array(F + 1);
  fillX(row, x);
  x[F] = t;
  return predict(nui.gBeta, x);
}

function eHat(nui: Nuisance, row: DmlGameRow): number {
  const x = new Float64Array(F);
  fillX(row, x);
  return predict(nui.eBeta, x);
}

function aipw(row: DmlGameRow, nui: Nuisance): { psi: number; e: number; trimmed: boolean } {
  let e = eHat(nui, row);
  e = Math.min(0.999, Math.max(0.001, e));
  const trimmed = e < TRIM_LOW || e > TRIM_HIGH;
  if (trimmed) {
    e = Math.min(TRIM_HIGH, Math.max(TRIM_LOW, e));
  }
  const g1 = gHat(nui, row, 1);
  const g0 = gHat(nui, row, 0);
  const t = row.treatment;
  const y = row.win;
  const psi = g1 - g0 + (t * (y - g1)) / e - ((1 - t) * (y - g0)) / (1 - e);
  return { psi, e, trimmed };
}

function summarize(psis: number[], es: number[], trimmed: number, nTreated: number): DmlEstimate {
  const n = psis.length;
  let mean = 0;
  for (const p of psis) mean += p;
  mean = n > 0 ? mean / n : 0;
  let v = 0;
  for (const p of psis) v += (p - mean) * (p - mean);
  const se = n > 1 ? Math.sqrt(v / (n * (n - 1))) : 0;
  const p0 = 0.5;
  const implied = Math.log((p0 + mean) / (1 - (p0 + mean))) - Math.log(p0 / (1 - p0));
  let eMin = 1;
  let eMax = 0;
  let eSum = 0;
  for (const e of es) {
    eSum += e;
    if (e < eMin) eMin = e;
    if (e > eMax) eMax = e;
  }
  return {
    att: mean,
    se,
    ciLow: mean - 1.96 * se,
    ciHigh: mean + 1.96 * se,
    n,
    nTreated,
    nTrimmed: trimmed,
    meanPropensity: es.length ? eSum / es.length : 0,
    minPropensity: es.length ? eMin : 0,
    maxPropensity: es.length ? eMax : 0,
    impliedLogitShift: Number.isFinite(implied) ? implied : 0,
    filterGain: FILTER_INTERVENTION_GAIN,
    priced: false,
    status: "shadow",
  };
}

function scoreFolds(rows: readonly DmlGameRow[]): { psis: number[]; es: number[]; trimmed: number; nTreated: number } {
  const folds = timeFolds(rows);
  const psis: number[] = [];
  const es: number[] = [];
  let trimmed = 0;
  let nTreated = 0;
  for (let k = 1; k < folds.length; k++) {
    const train: DmlGameRow[] = [];
    for (let j = 0; j < k; j++) train.push(...folds[j]!);
    if (train.length < 20) continue;
    const nui = fitNuisance(train);
    for (const row of folds[k]!) {
      const r = aipw(row, nui);
      psis.push(r.psi);
      es.push(r.e);
      if (r.trimmed) trimmed += 1;
      if (row.treatment === 1) nTreated += 1;
    }
  }
  return { psis, es, trimmed, nTreated };
}

export function estimateQbOutAtt(rows: readonly DmlGameRow[]): DmlEstimate {
  if (rows.length === 0) {
    return summarize([], [], 0, 0);
  }
  const s = scoreFolds(rows);
  return summarize(s.psis, s.es, s.trimmed, s.nTreated);
}

/** Shuffle treatment within week (keeps prevalence); re-estimate. */
export function placeboAtt(rows: readonly DmlGameRow[], seed: number): DmlEstimate {
  const shuffled = shuffleTreatmentWithinWeek(rows, seed);
  return estimateQbOutAtt(shuffled);
}

function shuffleTreatmentWithinWeek(rows: readonly DmlGameRow[], seed: number): DmlGameRow[] {
  let s = seed >>> 0;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const byKey = new Map<string, DmlGameRow[]>();
  for (const r of rows) {
    const k = `${r.season}-${r.week}`;
    const arr = byKey.get(k) ?? [];
    arr.push(r);
    byKey.set(k, arr);
  }
  const out: DmlGameRow[] = [];
  for (const group of byKey.values()) {
    const treatments = group.map((g) => g.treatment);
    for (let i = treatments.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = treatments[i]!;
      treatments[i] = treatments[j]!;
      treatments[j] = tmp;
    }
    for (let i = 0; i < group.length; i++) {
      const g = group[i]!;
      const t = treatments[i]!;
      out.push({
        ...g,
        treatment: t,
        qbStatus: t === 0 ? "active" : g.qbStatus === "active" ? "out" : g.qbStatus,
      });
    }
  }
  return out;
}

/**
 * Sensitivity: interval ATT ± Γ * se. Γ=1 is the usual CI; Γ>1 widens for
 * unobserved confounding. Not a Rosenbaum full bounds implementation —
 * an honest one-parameter envelope.
 */
export function sensitivityInterval(est: DmlEstimate, gamma: number): readonly [number, number] {
  if (!(gamma >= 1) || !Number.isFinite(gamma)) {
    throw new RangeError(`sensitivity gamma must be ≥ 1, received ${gamma}`);
  }
  const w = gamma * 1.96 * est.se;
  return [est.att - w, est.att + w];
}

export function diagnoseQbOut(rows: readonly DmlGameRow[], placeboSeed = 7): DmlDiagnostics {
  const estimate = estimateQbOutAtt(rows);
  const placebo = placeboAtt(rows, placeboSeed);
  const gamma = 2;
  const sens = sensitivityInterval(estimate, gamma);
  return {
    estimate,
    placeboAtt: placebo.att,
    placeboCiLow: placebo.ciLow,
    placeboCiHigh: placebo.ciHigh,
    placeboContainsZero: placebo.ciLow <= 0 && placebo.ciHigh >= 0,
    overlapTrimmedFrac: estimate.n > 0 ? estimate.nTrimmed / estimate.n : 0,
    sensitivityGamma: gamma,
    sensitivityInterval: sens,
    sutvaNote: SUTVA,
  };
}
