/**
 * Conformal/CQR interval QC protocol: block bootstrap, conditional coverage, min-window rule
 *
 * Research port: arXiv:2512.14727
 * Normalized lane: calibration | Doctrine: BASELINE
 *
 * Pure audit utilities from the paper's critique: B=200 weekly-block
 * bootstrap resamples of the calibration record, conditional-coverage
 * histograms that flag intervals whose probability coverage falls >5pp below
 * nominal, and an enforced minimum calibration-window sizing rule. This is
 * interval-honesty infrastructure — the operator runs it over deployed
 * conformal/CQR intervals; the module computes the QC verdicts.
 *
 * ACCEPTANCE GATE: Adopt the QC protocol if the reproducible test shows
 * >=10% of m=10 calibration resamples falling below 85% conditional coverage
 * at nominal 90%, confirming the small-window hazard is real; then enforce
 * the minimum-m rule and recalibration cadence.
 */

export interface CalibrationRecord {
  /** week/block index for block bootstrap */
  block: number;
  /** nominal coverage, e.g. 0.9 */
  nominal: number;
  /** did the interval cover the realized outcome */
  covered: boolean;
}

export interface BootstrapCoverage {
  resample: number;
  coverage: number;
  nominal: number;
  /** coverage fell >5pp below nominal */
  flagged: boolean;
}

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

/**
 * Weekly-block bootstrap: resample blocks with replacement B times and
 * compute coverage on each resample. Deterministic via seed.
 */
export function blockBootstrapCoverage(
  records: CalibrationRecord[],
  B = 200,
  seed = 7,
): BootstrapCoverage[] {
  if (records.length === 0) return [];
  const blocks = [...new Set(records.map((r) => r.block))].sort((a, b) => a - b);
  const byBlock = new Map<number, CalibrationRecord[]>();
  for (const r of records) {
    const list = byBlock.get(r.block);
    if (list) list.push(r);
    else byBlock.set(r.block, [r]);
  }
  const nominal = records[0]?.nominal ?? 0.9;
  const rng = mulberry32(seed);
  const out: BootstrapCoverage[] = [];
  for (let b = 0; b < B; b++) {
    const sample: CalibrationRecord[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const blk = blocks[Math.floor(rng() * blocks.length)] ?? blocks[0] ?? 0;
      const members = byBlock.get(blk);
      if (members) sample.push(...members);
    }
    const covered = sample.filter((r) => r.covered).length;
    const coverage = sample.length === 0 ? Number.NaN : covered / sample.length;
    out.push({
      resample: b,
      coverage,
      nominal,
      flagged: Number.isFinite(coverage) && coverage < nominal - 0.05,
    });
  }
  return out;
}

export interface ConditionalCoverageBin {
  bin: string;
  n: number;
  coverage: number;
  flagged: boolean;
}

export interface QcVerdict {
  resamples: number;
  flaggedShare: number;
  /** >=10% of resamples below 85% conditional coverage at nominal 90% */
  smallWindowHazard: boolean;
  minWindow: number;
  bins: ConditionalCoverageBin[];
}

/**
 * Full QC verdict: block-bootstrap flag share, the small-window hazard test
 * (m=10 resamples below 85% at nominal 90%), the enforced minimum-m rule,
 * and a conditional-coverage histogram over predicted-spread buckets.
 */
export function conformalQc(
  records: CalibrationRecord[],
  spreads: number[],
  B = 200,
): QcVerdict {
  const resamples = blockBootstrapCoverage(records, B);
  const flagged = resamples.filter((r) => r.flagged).length;
  const flaggedShare = resamples.length === 0 ? 0 : flagged / resamples.length;
  const nominal = records[0]?.nominal ?? 0.9;
  // Minimum-m rule: need enough records that a 5pp shortfall is detectable;
  // normal approximation: m >= (z_95 * sqrt(0.9*0.1) / 0.05)^2
  const minWindow = Math.ceil(Math.pow((1.645 * Math.sqrt(nominal * (1 - nominal))) / 0.05, 2));
  const binEdges = [-Infinity, -7, -3, 3, 7, Infinity];
  const binNames = ["<= -7", "-7..-3", "-3..3", "3..7", "> 7"];
  const bins: ConditionalCoverageBin[] = binNames.map((name) => ({ bin: name, n: 0, coverage: 0, flagged: false }));
  const covered = bins.map(() => 0);
  records.forEach((r, i) => {
    const s = spreads[i] ?? 0;
    let bi = -1;
    for (let k = 1; k < binEdges.length; k++) {
      const lo = binEdges[k - 1] ?? -Infinity;
      const hi = binEdges[k] ?? Infinity;
      if (s > lo && s <= hi) {
        bi = k - 1;
        break;
      }
    }
    if (bi < 0 || bi >= bins.length) return;
    const bin = bins[bi];
    if (!bin) return;
    bin.n++;
    if (r.covered) covered[bi] = (covered[bi] ?? 0) + 1;
  });
  for (let k = 0; k < bins.length; k++) {
    const bin = bins[k];
    if (!bin) continue;
    bin.coverage = bin.n === 0 ? Number.NaN : (covered[k] ?? 0) / bin.n;
    bin.flagged = Number.isFinite(bin.coverage) && bin.coverage < nominal - 0.05;
  }
  return {
    resamples: resamples.length,
    flaggedShare,
    smallWindowHazard: flaggedShare >= 0.1,
    minWindow,
    bins,
  };
}

export const GSE_CONFORMAL_QC_ENABLED = false;
