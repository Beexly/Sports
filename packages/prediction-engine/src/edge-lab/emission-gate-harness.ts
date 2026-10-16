/**
 * EMISSION-GATE SCORING HARNESS — Phase 1 items 1, 3, 4 of work order
 * `motif-to-hermes-emission-gate-build-2026-10-16.md`.
 *
 * Runs the frozen protocol's arms over the eval set and scores them:
 *   arm (a) this gate (with harness-fitted stacking weights),
 *   arm (b) simple weighted ensemble + market prior,
 *   arm (c) market-only,
 * plus the pass-all and edge-threshold reference rules, against the
 * pre-registered bars. Everything here is deterministic (seeded bootstrap,
 * no clock, no randomness beyond the seed) and everything is labeled
 * PROXY-CLV: the on-disk eval set has `clv_available=false` on all rows, so
 * CLV metrics are proxies (beat-close rate + passed-set mean units) until
 * the true-CLV dataset v2 lands.
 *
 * THE WEIGHTS PRODUCED HERE ARE HARNESS ARTIFACTS. They are fitted on the
 * calibration split only, logged with their provenance, and are NOT the
 * engine's live emission policy until the frozen protocol run publishes a
 * verdict that promotes them. The gate itself (emission-gate.ts) stays
 * judgment-free: it evaluates whatever weights are handed to it.
 *
 * Leakage rules honoured (design doc): state builder uses whitelist fields
 * only; label columns are joined AFTER the ruling columns are computed;
 * Tier B is corroboration-only and is never tuned on.
 */

import {
  evaluateEmissionGate,
  type EmissionDecision,
  type GateSignals,
} from "./emission-gate.js";

/** One eval-set row, whitelist fields only (design doc). */
export interface HarnessRow {
  /** Stable row id (for audit trails). */
  readonly rowId: string;
  /** Game key — the cluster unit for the bootstrap. */
  readonly gameKey: string;
  /** Market id (e.g. MONEYLINE, SPREAD, TOTAL). */
  readonly market: string;
  /** Base signals (model-side), all in [0,1]. */
  readonly baseSignals: Readonly<Record<string, number>>;
  /** Devigged market prior for the selected outcome, when available. */
  readonly marketPrior?: number;
  /** Label: 1 = selected outcome hit, 0 = missed. Labels join AFTER rulings
   * are computed; harness arms never read this field before scoring. */
  readonly outcome?: number;
  /** Settled units for the selected outcome (Tier A rows). Absent on Tier B
   * rows (outcome-only corroboration). */
  readonly units?: number;
  /** Ordered period (week/round) for walk-forward blocks, when known. */
  readonly period?: string | number;
  /** Tier tag ("A" | "B"). Tier B is corroboration-only. */
  readonly tier?: string;
}

/** Calibrated stacking weights with full provenance. */
export interface CalibratedGateWeights {
  readonly weights: Readonly<Record<string, number>>;
  readonly method: "logistic-stacking-l2";
  /** Which rows fitted them (split label + n). */
  readonly fittedOn: string;
  readonly nRows: number;
  /** Ridge strength used. */
  readonly lambda: number;
  /** Harness artifact marker — never engine-live policy by itself. */
  readonly harnessArtifact: true;
  /** Convergence info from IRLS. */
  readonly iterations: number;
  readonly converged: boolean;
}

/** A scored arm: decisions per row plus aggregate metrics. */
export interface ArmResult {
  readonly arm: string;
  /** Per-row decisions for gate-style arms (absent for pass-all). */
  readonly decisions?: Readonly<Record<string, EmissionDecision>>;
  readonly emitted: ReadonlySet<string>;
  readonly metrics: ArmMetrics;
  readonly notes: readonly string[];
}

export interface ArmMetrics {
  /** Rows the arm emitted / total rows. */
  readonly n: number;
  readonly coverage: number;
  /** Mean units per emitted pick (proxy CLV; rows without units excluded
   * from the mean and counted in `nNoUnits`). */
  readonly meanUnits: number | null;
  readonly nNoUnits: number;
  /** 95% cluster-bootstrap CI (by game) around meanUnits. */
  readonly meanUnitsCi95: readonly [number, number] | null;
  /** Emitted-set win rate on labeled rows. */
  readonly winRate: number | null;
  readonly nLabeled: number;
  /** Beat-close rate proxy (win rate on emitted labeled rows; spread rows
   * cover == win). */
  readonly beatClose: number | null;
  readonly falsePass: number | null;
  readonly falseReject: number | null;
  /** Brier / log-loss on emitted labeled rows using the arm's probability. */
  readonly brier: number | null;
  readonly logLoss: number | null;
  /** ECE with the reliability read printed alongside. */
  readonly ece: number | null;
  readonly reliability: readonly ReliabilityBin[] | null;
  readonly auc: number | null;
  /** Fraction of emitted rows sharing a (game, market) key with another
   * emitted row. */
  readonly duplicationRate: number;
  /** Walk-forward blocks (when periods present). */
  readonly walkForward: readonly WalkForwardBlock[] | null;
  /** Risk-coverage curve for selective arms. */
  readonly riskCoverage: readonly RiskCoveragePoint[] | null;
}

export interface ReliabilityBin {
  readonly bin: string;
  readonly n: number;
  readonly meanP: number;
  readonly winRate: number;
  readonly gap: number;
}

export interface WalkForwardBlock {
  readonly period: string;
  readonly n: number;
  readonly meanUnits: number | null;
  readonly profitFactor: number | null;
  readonly maxDrawdown: number | null;
}

export interface RiskCoveragePoint {
  readonly coverage: number;
  readonly meanUnits: number | null;
}

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) — one seeded stream, nothing global.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOOTSTRAP_DRAWS = 2000;
/** Protocol seed (Motif's provenance date). */
export const BOOTSTRAP_SEED = 20261015;

/** Percentile CI over cluster (game) bootstrap of the mean. */
export function clusterBootstrapCi(
  rows: readonly HarnessRow[],
  emitted: ReadonlySet<string>,
  draws: number = BOOTSTRAP_DRAWS,
  seed: number = BOOTSTRAP_SEED,
): readonly [number, number] | null {
  const unitRows = rows.filter((r) => emitted.has(r.rowId) && typeof r.units === "number" && Number.isFinite(r.units));
  if (unitRows.length === 0) return null;
  const byGame = new Map<string, number[]>();
  for (const r of unitRows) {
    const arr = byGame.get(r.gameKey) ?? [];
    arr.push(r.units as number);
    byGame.set(r.gameKey, arr);
  }
  const games = [...byGame.entries()];
  if (games.length === 0) return null;
  const rng = mulberry32(seed);
  const means: number[] = [];
  for (let d = 0; d < draws; d++) {
    let sum = 0;
    let count = 0;
    for (let g = 0; g < games.length; g++) {
      const pick = games[Math.floor(rng() * games.length)]!;
      for (const u of pick[1]) {
        sum += u;
        count++;
      }
    }
    means.push(count > 0 ? sum / count : 0);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(0.025 * (draws - 1))]!;
  const hi = means[Math.ceil(0.975 * (draws - 1))]!;
  return [lo, hi];
}

// ---------------------------------------------------------------------------
// Fitting: deterministic IRLS logistic stacking with L2 ridge.
// ---------------------------------------------------------------------------

/** Fit stacking weights on the given rows (calibration split ONLY — callers
 * must never pass the held-out test split; that is a protocol kill). */
export function fitStackingWeights(
  rows: readonly HarnessRow[],
  opts: { lambda?: number; maxIter?: number; tol?: number; splitLabel?: string } = {},
): CalibratedGateWeights {
  const lambda = opts.lambda ?? 1e-3;
  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-8;
  const signalNames = [...new Set(rows.flatMap((r) => Object.keys(r.baseSignals)))].sort();
  const p = signalNames.length;
  if (p === 0) {
    return {
      weights: {},
      method: "logistic-stacking-l2",
      fittedOn: opts.splitLabel ?? "unlabeled",
      nRows: 0,
      lambda,
      harnessArtifact: true,
      iterations: 0,
      converged: false,
    };
  }
  // Design matrix: x = signal - 0.5 (centered; matches the gate's stacking).
  const xs: number[][] = [];
  const ys: number[] = [];
  for (const r of rows) {
    if (r.outcome !== 0 && r.outcome !== 1) continue;
    const x = signalNames.map((n) => {
      const v = r.baseSignals[n];
      return typeof v === "number" && Number.isFinite(v) ? v - 0.5 : 0;
    });
    xs.push(x);
    ys.push(r.outcome);
  }
  const n = ys.length;
  if (n === 0) {
    // No labeled rows: an empty fit. Report converged:false — there is no
    // evidence here, and a clean-but-empty fit would read as fitted evidence.
    return {
      weights: Object.fromEntries(signalNames.map((name) => [name, 0])),
      method: "logistic-stacking-l2",
      fittedOn: opts.splitLabel ?? "unlabeled",
      nRows: 0,
      lambda,
      harnessArtifact: true,
      iterations: 0,
      converged: false,
    };
  }
  let beta = new Array<number>(p).fill(0);
  let iterations = 0;
  let converged = false;
  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    const grad = new Array<number>(p).fill(0);
    const hess = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      let z = 0;
      for (let j = 0; j < p; j++) z += beta[j]! * xs[i]![j]!;
      const mu = 1 / (1 + Math.exp(-z));
      const w = Math.max(mu * (1 - mu), 1e-10);
      const r = ys[i]! - mu;
      for (let j = 0; j < p; j++) {
        grad[j]! += r * xs[i]![j]!;
        for (let k = 0; k < p; k++) hess[j]![k]! -= w * xs[i]![j]! * xs[i]![k]!;
      }
    }
    // Ridge: grad += lambda*beta; hess -= lambda on the diagonal. Solve the
    // p x p system (Gaussian elimination with partial pivoting — deterministic).
    for (let j = 0; j < p; j++) {
      grad[j]! += lambda * beta[j]!;
      hess[j]![j]! -= lambda;
    }
    const delta = solveLinear(hess, grad.map((g) => -g));
    if (!delta) break;
    for (let j = 0; j < p; j++) beta[j]! += delta[j]!;
    const step = Math.max(...delta.map((d) => Math.abs(d)));
    if (step < tol) {
      converged = true;
      break;
    }
  }
  const weights: Record<string, number> = {};
  signalNames.forEach((name, j) => {
    weights[name] = beta[j]!;
  });
  return {
    weights,
    method: "logistic-stacking-l2",
    fittedOn: opts.splitLabel ?? "unlabeled",
    nRows: n,
    lambda,
    harnessArtifact: true,
    iterations,
    converged,
  };
}

function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    if (Math.abs(m[piv]![col]!) < 1e-12) return null;
    [m[col], m[piv]] = [m[piv]!, m[col]!];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / m[col]![col]!;
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  return m.map((row, i) => row[n]! / row[i]!);
}

// ---------------------------------------------------------------------------
// Arms.
// ---------------------------------------------------------------------------

function probFor(row: HarnessRow, weights: Readonly<Record<string, number>>): number {
  let z = 0;
  let votes = 0;
  for (const [name, w] of Object.entries(weights)) {
    const s = row.baseSignals[name];
    if (typeof s !== "number" || !Number.isFinite(s) || w === 0) continue;
    z += w * (s - 0.5);
    votes++;
  }
  return votes > 0 ? 1 / (1 + Math.exp(-z)) : NaN;
}

/** Arm (a): this gate. Builds gate inputs per row, evaluates, emits where the
 * gate says emit. Simulation/CLV are absent on the proxy set and logged as
 * such per candidate (the gate trails record it). */
export function runGateArm(
  rows: readonly HarnessRow[],
  weights: CalibratedGateWeights,
  opts: { threshold?: number; abstainBand?: number; arm?: string } = {},
): ArmResult {
  const decisions: Record<string, EmissionDecision> = {};
  const emitted = new Set<string>();
  for (const r of rows) {
    const signals: GateSignals = {
      baseSignals: r.baseSignals,
      calibratedWeights: weights.weights,
      marketCloseProb: r.marketPrior,
      // No decimalPrices: the proxy set carries priors already devigged.
      // No clvDisagreement: clv_available=false on the on-disk set.
      // No simulation: the correlated-simulation layer has not run yet.
    };
    const res = evaluateEmissionGate({
      gameKey: r.gameKey,
      market: r.market,
      selection: r.rowId,
      signals,
      threshold: opts.threshold,
      abstainBand: opts.abstainBand,
    });
    decisions[r.rowId] = res.decision;
    if (res.decision === "emit") emitted.add(r.rowId);
  }
  return {
    arm: opts.arm ?? "gate",
    decisions,
    emitted,
    metrics: scoreArm(rows, emitted, (row) => probFor(row, weights.weights)),
    notes: [
      "clvDisagreement absent on every row (clv_available=false) -> disagreement term 0; PROXY-CLV",
      "simulation layer not run on the proxy set -> tailVerdict not_run per candidate",
      weights.converged
        ? `stacking weights: harness artifact, fitted on ${weights.fittedOn} (n=${weights.nRows}, ${weights.iterations} IRLS iterations)`
        : `stacking weights DID NOT CONVERGE (${weights.iterations} iterations) — arm runs on an unconverged fit; flagged for the scorecard`,
    ],
  };
}

/** Arm (b): simple weighted ensemble + market prior (uniform mean of base
 * signals blended with the market prior, threshold rule at fixed edge). */
export function runEnsembleArm(
  rows: readonly HarnessRow[],
  opts: { marketBlend?: number; edgeThreshold?: number } = {},
): ArmResult {
  const blend = opts.marketBlend ?? 0.5;
  const edge = opts.edgeThreshold ?? 0.0;
  const emitted = new Set<string>();
  const probs = new Map<string, number>();
  for (const r of rows) {
    const sigs = Object.values(r.baseSignals).filter((v) => Number.isFinite(v));
    const modelP = sigs.length > 0 ? sigs.reduce((a, b) => a + b, 0) / sigs.length : NaN;
    const p = Number.isFinite(modelP) && Number.isFinite(r.marketPrior)
      ? blend * modelP + (1 - blend) * (r.marketPrior as number)
      : modelP;
    probs.set(r.rowId, p);
    if (Number.isFinite(p) && Number.isFinite(r.marketPrior) && p - (r.marketPrior as number) > edge) {
      emitted.add(r.rowId);
    }
  }
  return {
    arm: "ensemble+market",
    emitted,
    metrics: scoreArm(rows, emitted, (row) => probs.get(row.rowId) ?? NaN),
    notes: [`uniform base-signal mean blended ${blend} with market prior; emit iff edge > ${edge}`],
  };
}

/** Arm (c): market-only — emit everything with a market prior (no selection). */
export function runMarketOnlyArm(rows: readonly HarnessRow[]): ArmResult {
  const emitted = new Set<string>();
  for (const r of rows) if (Number.isFinite(r.marketPrior)) emitted.add(r.rowId);
  return {
    arm: "market-only",
    emitted,
    metrics: scoreArm(rows, emitted, (r) => r.marketPrior ?? NaN),
    notes: ["emits every row with a market prior; the floor the gate must beat by the frozen margins"],
  };
}

/** Reference: pass-all (no selection at all). */
export function runPassAllArm(rows: readonly HarnessRow[]): ArmResult {
  const emitted = new Set<string>(rows.map((r) => r.rowId));
  return {
    arm: "pass-all",
    emitted,
    metrics: scoreArm(rows, emitted, (r) => {
      const sigs = Object.values(r.baseSignals).filter((v) => Number.isFinite(v));
      return sigs.length > 0 ? sigs.reduce((a, b) => a + b, 0) / sigs.length : NaN;
    }),
    notes: ["Tier A reference from the design: pooled -0.0859 u/pick (Motif measurement)"],
  };
}

/** Reference: edge-threshold rule (Motif's first in-run measurement used
 * pass iff raw model edge > 0). */
export function runEdgeThresholdArm(rows: readonly HarnessRow[], edgeThreshold = 0): ArmResult {
  const emitted = new Set<string>();
  const probs = new Map<string, number>();
  for (const r of rows) {
    const sigs = Object.values(r.baseSignals).filter((v) => Number.isFinite(v));
    const p = sigs.length > 0 ? sigs.reduce((a, b) => a + b, 0) / sigs.length : NaN;
    probs.set(r.rowId, p);
    if (Number.isFinite(p) && Number.isFinite(r.marketPrior) && p - (r.marketPrior as number) > edgeThreshold) {
      emitted.add(r.rowId);
    }
  }
  return {
    arm: `edge-threshold>${edgeThreshold}`,
    emitted,
    metrics: scoreArm(rows, emitted, (row) => probs.get(row.rowId) ?? NaN),
    notes: [`known reference: pooled passed-set -0.1249 u/pick at this rule (Motif, worse than pass-all)`],
  };
}

// ---------------------------------------------------------------------------
// Metrics.
// ---------------------------------------------------------------------------

function mean(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function brierScore(pairs: readonly (readonly [number, number])[]): number | null {
  if (pairs.length === 0) return null;
  return pairs.reduce((acc, [p, y]) => acc + (p - y) * (p - y), 0) / pairs.length;
}

export function logLoss(pairs: readonly (readonly [number, number])[]): number | null {
  if (pairs.length === 0) return null;
  let s = 0;
  for (const [p, y] of pairs) {
    const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
    s += -(y * Math.log(q) + (1 - y) * Math.log(1 - q));
  }
  return s / pairs.length;
}

export function eceWithReliability(
  pairs: readonly (readonly [number, number])[],
  bins = 10,
): { ece: number | null; reliability: readonly ReliabilityBin[] | null } {
  if (pairs.length === 0) return { ece: null, reliability: null };
  const bucket = Array.from({ length: bins }, () => ({ n: 0, sp: 0, sy: 0 }));
  for (const [p, y] of pairs) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(p * bins)));
    bucket[b]!.n++;
    bucket[b]!.sp += p;
    bucket[b]!.sy += y;
  }
  const reliability: ReliabilityBin[] = [];
  let ece = 0;
  for (let i = 0; i < bins; i++) {
    const b = bucket[i]!;
    if (b.n === 0) continue;
    const mp = b.sp / b.n;
    const wr = b.sy / b.n;
    const gap = Math.abs(mp - wr);
    ece += (b.n / pairs.length) * gap;
    reliability.push({ bin: `${(i / bins).toFixed(1)}-${((i + 1) / bins).toFixed(1)}`, n: b.n, meanP: mp, winRate: wr, gap });
  }
  return { ece, reliability };
}

/** AUC (Mann-Whitney, ties count 0.5). Null when only one class present. */
export function auc(pairs: readonly (readonly [number, number])[]): number | null {
  const pos = pairs.filter(([, y]) => y === 1).length;
  const neg = pairs.length - pos;
  if (pos === 0 || neg === 0) return null;
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  let rankSumPos = 0;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1]![0] === sorted[i]![0]) j++;
    const avgRank = (i + j) / 2 + 1; // 1-indexed average rank for the tie group
    // Mixed-label tie groups: each positive row in the group earns the
    // group's average rank; negatives earn it too (both count the tie 0.5).
    for (let k = i; k <= j; k++) {
      if (sorted[k]![1] === 1) rankSumPos += avgRank;
    }
    i = j + 1;
  }
  return (rankSumPos - (pos * (pos + 1)) / 2) / (pos * neg);
}

/** Duplication rate: share of emitted rows whose (game, market) key appears
 * more than once in the emitted set. */
export function duplicationRate(rows: readonly HarnessRow[], emitted: ReadonlySet<string>): number {
  const emittedRows = rows.filter((r) => emitted.has(r.rowId));
  if (emittedRows.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const r of emittedRows) {
    const key = `${r.gameKey}|${r.market}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let dupes = 0;
  for (const [, c] of counts) if (c > 1) dupes += c;
  return dupes / emittedRows.length;
}

/** Walk-forward blocks in period order: ROI (mean units), profit factor,
 * max drawdown per block, over the emitted set. */
export function walkForwardBlocks(
  rows: readonly HarnessRow[],
  emitted: ReadonlySet<string>,
): readonly WalkForwardBlock[] | null {
  const withPeriod = rows.filter((r) => emitted.has(r.rowId) && r.period !== undefined);
  if (withPeriod.length === 0) return null;
  const periods = [...new Set(withPeriod.map((r) => String(r.period)))].sort();
  const blocks: WalkForwardBlock[] = [];
  for (const period of periods) {
    const rs = withPeriod.filter((r) => String(r.period) === period);
    const units = rs.map((r) => r.units).filter((u): u is number => typeof u === "number" && Number.isFinite(u));
    let cum = 0;
    let peak = 0;
    let maxDd = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    for (const u of units) {
      cum += u;
      peak = Math.max(peak, cum);
      maxDd = Math.max(maxDd, peak - cum);
      if (u > 0) grossProfit += u;
      else grossLoss += -u;
    }
    blocks.push({
      period,
      n: units.length,
      meanUnits: mean(units),
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
      maxDrawdown: units.length > 0 ? maxDd : null,
    });
  }
  return blocks;
}

/** Risk-coverage curve: for a grid of scores (higher = more selective), the
 * coverage and emitted-set mean units at each grid point. */
export function riskCoverageCurve(
  rows: readonly HarnessRow[],
  scoreOf: (r: HarnessRow) => number,
  gridSteps = 20,
): readonly RiskCoveragePoint[] {
  const scored = rows
    .map((r) => ({ r, s: scoreOf(r) }))
    .filter((x) => Number.isFinite(x.s));
  if (scored.length === 0) return [];
  const scores = scored.map((x) => x.s).sort((a, b) => a - b);
  const lo = scores[0]!;
  const hi = scores[scores.length - 1]!;
  const points: RiskCoveragePoint[] = [];
  for (let g = 0; g <= gridSteps; g++) {
    const t = lo + ((hi - lo) * g) / gridSteps;
    const emitted = new Set(scored.filter((x) => x.s >= t).map((x) => x.r.rowId));
    const units = rows.filter((r) => emitted.has(r.rowId) && typeof r.units === "number").map((r) => r.units as number);
    points.push({ coverage: emitted.size / rows.length, meanUnits: mean(units) });
  }
  return points;
}

/** Full metric suite over one arm's emitted set. */
export function scoreArm(
  rows: readonly HarnessRow[],
  emitted: ReadonlySet<string>,
  probOf: (r: HarnessRow) => number,
): ArmMetrics {
  const emittedRows = rows.filter((r) => emitted.has(r.rowId));
  const unitsRows = emittedRows.filter((r) => typeof r.units === "number" && Number.isFinite(r.units));
  const labeled = emittedRows.filter((r) => r.outcome === 0 || r.outcome === 1);
  const labeledProbs = labeled.map((r) => probOf(r)).filter((p) => Number.isFinite(p));
  const pairs: (readonly [number, number])[] = [];
  for (const r of labeled) {
    const p = probOf(r);
    if (Number.isFinite(p)) pairs.push([p, r.outcome as number]);
  }
  const units = unitsRows.map((r) => r.units as number);
  const wins = labeled.map((r) => r.outcome as number);
  // False pass: emitted rows that lost (of labeled). False reject: missed
  // winners among labeled non-emitted rows.
  const nonEmittedLabeled = rows.filter((r) => !emitted.has(r.rowId) && (r.outcome === 0 || r.outcome === 1));
  const missedWinners = nonEmittedLabeled.filter((r) => r.outcome === 1).length;
  const { ece, reliability } = eceWithReliability(pairs);
  return {
    n: emittedRows.length,
    coverage: rows.length > 0 ? emittedRows.length / rows.length : 0,
    meanUnits: mean(units),
    nNoUnits: emittedRows.length - unitsRows.length,
    meanUnitsCi95: unitsRows.length > 0 ? clusterBootstrapCi(rows, emitted) : null,
    winRate: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : null,
    nLabeled: labeled.length,
    beatClose: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : null,
    falsePass: labeled.length > 0 ? labeled.filter((r) => r.outcome === 0).length / labeled.length : null,
    falseReject: nonEmittedLabeled.length > 0 ? missedWinners / nonEmittedLabeled.length : null,
    brier: brierScore(pairs),
    logLoss: logLoss(pairs),
    ece,
    reliability,
    auc: auc(pairs),
    duplicationRate: duplicationRate(rows, emitted),
    walkForward: walkForwardBlocks(rows, emitted),
    riskCoverage: riskCoverageCurve(rows, (r) => {
      const p = probOf(r);
      const mp = Number.isFinite(r.marketPrior) ? (r.marketPrior as number) : 0.5;
      return Number.isFinite(p) ? p - mp : -Infinity;
    }),
  };
}

// ---------------------------------------------------------------------------
// The frozen bars (work order, inlined; kill criteria included).
// ---------------------------------------------------------------------------

export interface FrozenBars {
  readonly meanUnitsMin: number; // >= +0.02
  readonly ciLbMin: number; // > -0.02
  readonly beatCloseMin: number; // >= 52.4%
  readonly brierMax: number; // <= 0.24
  readonly brierMarginVsMarket: number; // >= 0.005 better than market-only
  readonly eceMax: number; // <= 0.07
  readonly aucMin: number; // >= 0.58
  readonly falsePassMax: number; // <= 0.40
  readonly emitRateMin: number; // 15%
  readonly emitRateMax: number; // 85%
  readonly aucInvertedKill: number; // AUC < 0.50 = inverted confidence -> kill
}

export const FROZEN_BARS: FrozenBars = {
  meanUnitsMin: 0.02,
  ciLbMin: -0.02,
  beatCloseMin: 0.524,
  brierMax: 0.24,
  brierMarginVsMarket: 0.005,
  eceMax: 0.07,
  aucMin: 0.58,
  falsePassMax: 0.40,
  emitRateMin: 0.15,
  emitRateMax: 0.85,
  aucInvertedKill: 0.50,
};

export type GateVerdict = "SHADOW_SEAT" | "KILLED" | "INCONCLUSIVE";

export interface VerdictLine {
  readonly bar: string;
  readonly measured: string;
  readonly pass: boolean | null;
}

export interface GateVerdictResult {
  readonly verdict: GateVerdict;
  readonly lines: readonly VerdictLine[];
  readonly kills: readonly string[];
  readonly notes: readonly string[];
}

/** Apply the frozen bars to an arm's metrics. Market-only arm supplies the
 * Brier floor comparison. INCONCLUSIVE is legitimate at n=285 games. */
export function applyFrozenBars(
  arm: ArmResult,
  marketOnly: ArmMetrics | null,
  opts: { games?: number } = {},
): GateVerdictResult {
  const m = arm.metrics;
  const lines: VerdictLine[] = [];
  const kills: string[] = [];
  const notes: string[] = [];
  const bar = (name: string, measured: string, pass: boolean | null): VerdictLine => ({ bar: name, measured, pass });

  const meanOk = m.meanUnits != null ? m.meanUnits >= FROZEN_BARS.meanUnitsMin : null;
  lines.push(bar("emitted mean >= +0.02 u/pick", m.meanUnits == null ? "no units on set" : m.meanUnits.toFixed(4), meanOk));

  const ciLb = m.meanUnitsCi95 ? m.meanUnitsCi95[0] : null;
  const ciOk = ciLb != null ? ciLb > FROZEN_BARS.ciLbMin : null;
  lines.push(bar("95% CI LB > -0.02", ciLb == null ? "no units on set" : ciLb.toFixed(4), ciOk));

  const bcOk = m.beatClose != null ? m.beatClose >= FROZEN_BARS.beatCloseMin : null;
  lines.push(bar("beat-close >= 52.4%", m.beatClose == null ? "no labels" : (m.beatClose * 100).toFixed(1) + "%", bcOk));

  const brierOk = m.brier != null ? m.brier <= FROZEN_BARS.brierMax : null;
  lines.push(bar("Brier <= 0.24", m.brier == null ? "no labels" : m.brier.toFixed(4), brierOk));

  let brierMarginOk: boolean | null = null;
  if (m.brier != null && marketOnly?.brier != null) {
    brierMarginOk = marketOnly.brier - m.brier >= FROZEN_BARS.brierMarginVsMarket;
    lines.push(bar(`Brier margin vs market-only >= ${FROZEN_BARS.brierMarginVsMarket}`, (marketOnly.brier - m.brier).toFixed(4), brierMarginOk));
  } else {
    lines.push(bar(`Brier margin vs market-only >= ${FROZEN_BARS.brierMarginVsMarket}`, "market-only arm unscoreable", null));
  }

  const eceOk = m.ece != null ? m.ece <= FROZEN_BARS.eceMax : null;
  lines.push(bar("ECE <= 0.07", m.ece == null ? "no labels" : m.ece.toFixed(4), eceOk));

  const aucOk = m.auc != null ? m.auc >= FROZEN_BARS.aucMin : null;
  lines.push(bar("AUC >= 0.58", m.auc == null ? "no labels" : m.auc.toFixed(4), aucOk));

  const fpOk = m.falsePass != null ? m.falsePass <= FROZEN_BARS.falsePassMax : null;
  lines.push(bar("false-pass <= 0.40", m.falsePass == null ? "no labels" : m.falsePass.toFixed(4), fpOk));

  const coverageOk = m.coverage >= FROZEN_BARS.emitRateMin && m.coverage <= FROZEN_BARS.emitRateMax;
  lines.push(bar("emit rate in [15%, 85%]", (m.coverage * 100).toFixed(1) + "%", coverageOk));

  // Kill criteria (protocol): inverted confidence, miscalibrated tails,
  // look-ahead/test tuning (caller responsibility — noted), knowledge
  // filtering (doctrine kill — structural, checked by the caller's audit).
  if (m.auc != null && m.auc < FROZEN_BARS.aucInvertedKill) {
    kills.push(`KILL: AUC ${m.auc.toFixed(4)} < 0.50 — inverted confidence`);
  }
  if (arm.decisions && arm.notes.some((n) => n.includes("DID NOT CONVERGE"))) {
    notes.push("weights did not converge — treat the arm as diagnostic, not promotable");
  }
  if ((opts.games ?? 0) > 0 && opts.games! < 300) {
    notes.push(`n=${opts.games} games — INCONCLUSIVE is a legitimate verdict at this size`);
  }

  const allPass = lines.every((l) => l.pass !== false);
  const anyNull = lines.some((l) => l.pass === null);
  const verdict: GateVerdict = kills.length > 0 ? "KILLED" : allPass && !anyNull ? "SHADOW_SEAT" : anyNull ? "INCONCLUSIVE" : "KILLED";
  if (verdict === "KILLED" && kills.length === 0) {
    const failed = lines.filter((l) => l.pass === false).map((l) => l.bar);
    kills.push(`bars failed: ${failed.join("; ")}`);
  }
  return { verdict, lines, kills, notes };
}
