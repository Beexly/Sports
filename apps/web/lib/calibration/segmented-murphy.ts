/**
 * Segmented Murphy monitoring + integrity-guarded δ filter.
 *
 * Math (Murphy 1973; selective abstention):
 *   BS = REL − RES + UNC
 *   On accept set A_δ = {|p−0.5|≥δ}:
 *     BS_δ = E[(p−y)² | A_δ]
 *     For calibrated p: BS_δ ≈ UNC_δ − Var[p | A_δ]
 *   On paused set A_δᶜ:
 *     Integrity condition: BS_paused ≈ UNC_paused ≈ 0.25 (±ε)
 *     - BS_paused ≫ 0.25 → model systematically wrong where we discard (widen δ / fix model)
 *     - BS_paused ≪ 0.25 → discarding real skill (δ too aggressive)
 *
 * Constrained δ selection (decision-theoretic):
 *   minimize δ  s.t.  BS_δ ≤ brierTarget  AND  BS_paused ≥ pausedFloor
 *   (or maximize RES under the same integrity + Brier discipline)
 *
 * Offline / ops only. Does not flip PERFORMANCE_STATS, maps, or PROVEN.
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";

export type SegmentedRow = {
  readonly p: number;
  readonly y: 0 | 1;
  readonly groupKey?: string;
};

export type SegmentMurphySlice = {
  readonly n: number;
  readonly mass: number;
  readonly brier: number;
  readonly ece: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
  readonly baseRate: number;
  /** Sample variance of p on the slice (RES proxy when well-calibrated). */
  readonly varP: number;
  readonly meanP: number;
  readonly meanPWin: number;
  readonly meanPLoss: number;
  readonly separation: number;
};

export type IntegrityStatus =
  | "ok"
  | "discarding_skill"
  | "hiding_bad_region"
  | "insufficient_paused"
  | "insufficient_published";

export type SegmentedMurphyReport = {
  readonly delta: number;
  readonly full: SegmentMurphySlice;
  readonly published: SegmentMurphySlice;
  readonly paused: SegmentMurphySlice;
  readonly integrity: {
    readonly status: IntegrityStatus;
    readonly pausedBrier: number;
    readonly pausedUnc: number;
    readonly targetUnc: number;
    readonly tol: number;
    /** |BS_paused − UNC_paused| — small when integrity holds. */
    readonly absGap: number;
    readonly operatorHint: string;
  };
  /** Under perfect calibration, need Var[p|A] ≳ unc − brierFloor. */
  readonly varPNeededForFloor: number;
  readonly varPGap: number;
  readonly wouldPassBrierFloor: boolean;
  readonly brierFloor: number;
};

export type IntegrityGuardOptions = {
  /** Default 0.22 — GSE eligibility floor. */
  readonly brierFloor?: number;
  /** BS_paused must be ≥ this (default 0.24) so we don't discard skill. */
  readonly pausedBrierFloor?: number;
  /** BS_paused must be ≤ this (default 0.27) so paused region isn't a toxic hide. */
  readonly pausedBrierCeil?: number;
  /** |BS_paused − UNC_paused| ok band (default 0.02). */
  readonly integrityTol?: number;
  readonly minPublishedN?: number;
  readonly minPausedN?: number;
  /** Nominal coin-flip UNC for near-50 base rates. */
  readonly nominalUnc?: number;
};

const DEFAULTS = {
  brierFloor: 0.22,
  pausedBrierFloor: 0.24,
  pausedBrierCeil: 0.27,
  integrityTol: 0.02,
  minPublishedN: 30,
  minPausedN: 20,
  nominalUnc: 0.25,
} as const;

function emptySlice(): SegmentMurphySlice {
  return {
    n: 0,
    mass: 0,
    brier: NaN,
    ece: NaN,
    reliability: NaN,
    resolution: NaN,
    uncertainty: NaN,
    baseRate: NaN,
    varP: NaN,
    meanP: NaN,
    meanPWin: NaN,
    meanPLoss: NaN,
    separation: NaN,
  };
}

function sampleVariance(ps: readonly number[]): number {
  if (ps.length === 0) return NaN;
  if (ps.length === 1) return 0;
  const mean = ps.reduce((s, x) => s + x, 0) / ps.length;
  let ss = 0;
  for (const x of ps) ss += (x - mean) ** 2;
  return ss / ps.length;
}

export function sliceMurphy(
  rows: readonly SegmentedRow[],
  totalN: number,
): SegmentMurphySlice {
  if (rows.length === 0) return emptySlice();
  const samples: CalibrationSample[] = rows.map((r) => ({ p: r.p, y: r.y }));
  const d = brierDecomposition(samples);
  const wins = rows.filter((r) => r.y === 1);
  const losses = rows.filter((r) => r.y === 0);
  const meanPWin =
    wins.length === 0 ? NaN : wins.reduce((s, r) => s + r.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((s, r) => s + r.p, 0) / losses.length;
  const ps = rows.map((r) => r.p);
  const meanP = ps.reduce((s, x) => s + x, 0) / ps.length;
  return {
    n: rows.length,
    mass: totalN > 0 ? rows.length / totalN : 0,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    reliability: d.reliability,
    resolution: d.resolution,
    uncertainty: d.uncertainty,
    baseRate: d.baseRate,
    varP: sampleVariance(ps),
    meanP,
    meanPWin,
    meanPLoss,
    separation: meanPWin - meanPLoss,
  };
}

export function partitionByDelta(
  rows: readonly SegmentedRow[],
  delta: number,
): { published: SegmentedRow[]; paused: SegmentedRow[] } {
  const published: SegmentedRow[] = [];
  const paused: SegmentedRow[] = [];
  for (const r of rows) {
    if (Math.abs(r.p - 0.5) >= delta) published.push(r);
    else paused.push(r);
  }
  return { published, paused };
}

/**
 * Also partition by sport|market pause list (groupKey), then by δ.
 */
export function partitionByPauseAndDelta(
  rows: readonly SegmentedRow[],
  delta: number,
  pausedGroups: readonly string[] = [],
): { published: SegmentedRow[]; paused: SegmentedRow[] } {
  const pauseSet = new Set(pausedGroups);
  const published: SegmentedRow[] = [];
  const paused: SegmentedRow[] = [];
  for (const r of rows) {
    const groupPaused =
      r.groupKey != null && pauseSet.size > 0 && pauseSet.has(r.groupKey);
    if (groupPaused || Math.abs(r.p - 0.5) < delta) paused.push(r);
    else published.push(r);
  }
  return { published, paused };
}

function integrityOf(
  published: SegmentMurphySlice,
  paused: SegmentMurphySlice,
  opts: Required<IntegrityGuardOptions>,
): SegmentedMurphyReport["integrity"] {
  if (published.n < opts.minPublishedN) {
    return {
      status: "insufficient_published",
      pausedBrier: paused.brier,
      pausedUnc: paused.uncertainty,
      targetUnc: opts.nominalUnc,
      tol: opts.integrityTol,
      absGap: NaN,
      operatorHint: `Published n=${published.n} < ${opts.minPublishedN} — raise coverage or lower δ.`,
    };
  }
  if (paused.n < opts.minPausedN || !Number.isFinite(paused.brier)) {
    return {
      status: "insufficient_paused",
      pausedBrier: paused.brier,
      pausedUnc: paused.uncertainty,
      targetUnc: opts.nominalUnc,
      tol: opts.integrityTol,
      absGap: NaN,
      operatorHint: `Paused n=${paused.n} too thin for integrity check — δ may be near 0 or sample tiny.`,
    };
  }

  const unc = Number.isFinite(paused.uncertainty)
    ? paused.uncertainty
    : opts.nominalUnc;
  const absGap = Math.abs(paused.brier - unc);

  // Discarding skill: published filter is so aggressive that paused region
  // still has real skill (Brier well below UNC).
  if (paused.brier < opts.pausedBrierFloor - 1e-9) {
    return {
      status: "discarding_skill",
      pausedBrier: paused.brier,
      pausedUnc: unc,
      targetUnc: opts.nominalUnc,
      tol: opts.integrityTol,
      absGap,
      operatorHint: `BS_paused ${paused.brier.toFixed(4)} < ${opts.pausedBrierFloor} — δ too aggressive; discarding skill in the middle.`,
    };
  }

  // Hiding bad region: paused Brier much worse than UNC → model wrong there.
  if (paused.brier > opts.pausedBrierCeil + 1e-9) {
    return {
      status: "hiding_bad_region",
      pausedBrier: paused.brier,
      pausedUnc: unc,
      targetUnc: opts.nominalUnc,
      tol: opts.integrityTol,
      absGap,
      operatorHint: `BS_paused ${paused.brier.toFixed(4)} > ${opts.pausedBrierCeil} — model toxic near 0.5; widen δ / fix ranking, don't hide.`,
    };
  }

  // Tight integrity: |BS_paused − UNC| ≤ tol (ideal ≈ coin-flip noise)
  if (absGap > opts.integrityTol + 1e-9) {
    // Soft warning still "ok" if within floor/ceil band
    return {
      status: "ok",
      pausedBrier: paused.brier,
      pausedUnc: unc,
      targetUnc: opts.nominalUnc,
      tol: opts.integrityTol,
      absGap,
      operatorHint: `BS_paused ${paused.brier.toFixed(4)} within floor/ceil but |BS−UNC|=${absGap.toFixed(4)} > tol ${opts.integrityTol} — monitor.`,
    };
  }

  return {
    status: "ok",
    pausedBrier: paused.brier,
    pausedUnc: unc,
    targetUnc: opts.nominalUnc,
    tol: opts.integrityTol,
    absGap,
    operatorHint: `Integrity OK: BS_paused ${paused.brier.toFixed(4)} ≈ UNC ${unc.toFixed(4)} (±${opts.integrityTol}).`,
  };
}

export function computeSegmentedMurphy(
  rows: readonly SegmentedRow[],
  delta: number,
  options?: IntegrityGuardOptions & { readonly pausedGroups?: readonly string[] },
): SegmentedMurphyReport {
  const opts: Required<IntegrityGuardOptions> = {
    brierFloor: options?.brierFloor ?? DEFAULTS.brierFloor,
    pausedBrierFloor: options?.pausedBrierFloor ?? DEFAULTS.pausedBrierFloor,
    pausedBrierCeil: options?.pausedBrierCeil ?? DEFAULTS.pausedBrierCeil,
    integrityTol: options?.integrityTol ?? DEFAULTS.integrityTol,
    minPublishedN: options?.minPublishedN ?? DEFAULTS.minPublishedN,
    minPausedN: options?.minPausedN ?? DEFAULTS.minPausedN,
    nominalUnc: options?.nominalUnc ?? DEFAULTS.nominalUnc,
  };

  const totalN = rows.length;
  const full = sliceMurphy(rows, totalN);
  const { published: pubRows, paused: pauseRows } = options?.pausedGroups?.length
    ? partitionByPauseAndDelta(rows, delta, options.pausedGroups)
    : partitionByDelta(rows, delta);
  const published = sliceMurphy(pubRows, totalN);
  const paused = sliceMurphy(pauseRows, totalN);
  const integrity = integrityOf(published, paused, opts);

  // Calibrated identity: need Var[p|A] ≳ UNC − brierFloor (≈ 0.03 when UNC=0.25)
  const uncPub = Number.isFinite(published.uncertainty)
    ? published.uncertainty
    : opts.nominalUnc;
  const varPNeededForFloor = Math.max(0, uncPub - opts.brierFloor);
  const varPGap = Number.isFinite(published.varP)
    ? Math.max(0, varPNeededForFloor - published.varP)
    : NaN;

  return {
    delta,
    full,
    published,
    paused,
    integrity,
    varPNeededForFloor,
    varPGap,
    wouldPassBrierFloor:
      Number.isFinite(published.brier) &&
      published.brier <= opts.brierFloor &&
      published.n >= opts.minPublishedN,
    brierFloor: opts.brierFloor,
  };
}

export type IntegrityDeltaSweepResult = {
  readonly generatedAt: string;
  readonly grid: readonly SegmentedMurphyReport[];
  /**
   * Smallest δ that clears Brier floor with integrity ok (or nearest).
   * Null if none meet constraints.
   */
  readonly recommended: SegmentedMurphyReport | null;
  /** Best RES among integrity-ok + Brier-disciplined candidates. */
  readonly bestResUnderIntegrity: SegmentedMurphyReport | null;
  readonly note: string;
};

/**
 * Sweep δ with integrity guard.
 * Primary: min δ s.t. BS_pub ≤ floor AND integrity ∈ {ok, insufficient_paused}
 *   and n_pub ≥ minN.
 * Secondary: among integrity-ok candidates with BS_pub ≤ ceiling, max RES.
 */
export function integrityGuardedDeltaSweep(
  rows: readonly SegmentedRow[],
  options?: IntegrityGuardOptions & {
    readonly deltas?: readonly number[];
    readonly pausedGroups?: readonly string[];
    readonly brierCeiling?: number;
  },
): IntegrityDeltaSweepResult {
  const deltas =
    options?.deltas ?? [0, 0.05, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.25];
  const brierFloor = options?.brierFloor ?? DEFAULTS.brierFloor;
  const brierCeiling = options?.brierCeiling ?? 0.26;
  const minPub = options?.minPublishedN ?? DEFAULTS.minPublishedN;

  const grid = deltas.map((delta) =>
    computeSegmentedMurphy(rows, delta, {
      ...options,
      brierFloor,
      pausedGroups: options?.pausedGroups,
    }),
  );

  let recommended: SegmentedMurphyReport | null = null;
  for (const r of grid) {
    if (r.published.n < minPub) continue;
    if (!Number.isFinite(r.published.brier) || r.published.brier > brierFloor)
      continue;
    if (
      r.integrity.status === "discarding_skill" ||
      r.integrity.status === "hiding_bad_region"
    )
      continue;
    if (!recommended || r.delta < recommended.delta - 1e-12) {
      recommended = r;
    }
  }

  let bestResUnderIntegrity: SegmentedMurphyReport | null = null;
  for (const r of grid) {
    if (r.published.n < minPub) continue;
    if (!Number.isFinite(r.published.brier) || r.published.brier > brierCeiling)
      continue;
    if (
      r.integrity.status === "discarding_skill" ||
      r.integrity.status === "hiding_bad_region"
    )
      continue;
    if (
      !bestResUnderIntegrity ||
      r.published.resolution > bestResUnderIntegrity.published.resolution + 1e-9 ||
      (Math.abs(
        r.published.resolution - bestResUnderIntegrity.published.resolution,
      ) < 1e-9 &&
        r.published.brier < bestResUnderIntegrity.published.brier - 1e-9)
    ) {
      bestResUnderIntegrity = r;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    grid,
    recommended,
    bestResUnderIntegrity,
    note:
      "Integrity-guarded δ: prefer min δ with BS_pub≤0.22 and BS_paused≈UNC; " +
      "secondary max RES under Brier ceiling. Maps/stretch forbidden for RES theater.",
  };
}

/**
 * Back-of-envelope: under perfect calibration, BS = UNC − Var[p].
 * Required Var[p] to hit floor given UNC (and optional residual REL).
 */
export function varPNeededForBrierFloor(
  uncertainty: number,
  brierFloor = 0.22,
  residualRel = 0,
): number {
  // BS ≈ REL − RES + UNC, RES≈Var[p] when calibrated → Var ≥ REL + UNC − floor
  return Math.max(0, residualRel + uncertainty - brierFloor);
}

/** Stretch anti-pattern detector: linear stretch of p around 0.5. */
export function detectProbabilityStretch(
  raw: readonly number[],
  stretched: readonly number[],
  tol = 0.02,
): {
  readonly stretched: boolean;
  readonly approxFactor: number | null;
  readonly operatorHint: string;
} {
  if (raw.length !== stretched.length || raw.length < 5) {
    return {
      stretched: false,
      approxFactor: null,
      operatorHint: "Insufficient paired samples for stretch detection.",
    };
  }
  const ratios: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const d0 = raw[i]! - 0.5;
    const d1 = stretched[i]! - 0.5;
    if (Math.abs(d0) < 0.02) continue;
    ratios.push(d1 / d0);
  }
  if (ratios.length < 5) {
    return {
      stretched: false,
      approxFactor: null,
      operatorHint: "Not enough mass away from 0.5 to estimate stretch factor.",
    };
  }
  const mean = ratios.reduce((s, x) => s + x, 0) / ratios.length;
  const varR =
    ratios.reduce((s, x) => s + (x - mean) ** 2, 0) / ratios.length;
  const isStretched =
    mean > 1 + tol && varR < 0.05; // stable linear stretch > 1
  return {
    stretched: isStretched,
    approxFactor: mean,
    operatorHint: isStretched
      ? `ANTI-PATTERN: probability stretch ≈${mean.toFixed(2)}× around 0.5 — inflates Var[p] but destroys calibration (REL↑). Forbidden for RES theater.`
      : `No stable stretch detected (factor≈${mean.toFixed(2)}).`,
  };
}
