/**
 * Coverage self-audit (kernel K2) — the honesty artifact for our own published
 * CI bands.
 *
 * A public ROI band (bcaMeanCi / studentizedMeanCi) is deterministic and
 * reproducible, but "reproducible" is not the same as "well-calibrated on THIS
 * ledger's shape." This module answers a narrower, still-honest question:
 * treating the ledger's OWN empirical distribution as the best available
 * stand-in for the true return distribution (the bootstrap's founding
 * assumption), how often does the published CI method's band cover the
 * LEDGER'S OWN mean when we repeatedly resample from it?
 *
 * This is NOT a claim about coverage of the true unknown population mean — no
 * ground truth exists for a self-audit. It is a calibration DIAGNOSTIC ("under
 * resampling of our own record, does our 95% band behave like a 95% band?"),
 * reported openly via a verdict enum and NEVER used to silently widen or
 * narrow the published band (that would be double-bootstrap calibration — a
 * different, explicitly-not-built thing).
 *
 * Deterministic/seeded (auditable): same ledger + same seed -> byte-identical
 * result. Reuses bcaMeanCi/studentizedMeanCi as black boxes for the inner CI;
 * only the outer resampling loop is new code.
 *
 * NOT wired into any render/loader path: at the default 200 x 1000 draws this
 * is a batch/cron-tier computation, not a request-tier one. The intended
 * consumer is a nightly job that caches the verdict for the operator surface.
 */

import { bcaMeanCi, studentizedMeanCi, meanStatistic, type PerformanceCi, type CiMethod } from "./performance-ci.js";

export type CoverageVerdict = "CALIBRATED" | "BORDERLINE" | "UNDERCOVERING";

export interface CoverageSelfAuditResult {
  readonly method: Extract<CiMethod, "bca" | "studentized">;
  readonly n: number;
  /** The ledger's own empirical mean — the audit's coverage target. */
  readonly targetMean: number;
  readonly nominalCoverage: number; // 1 - alpha
  readonly realizedCoverage: number;
  readonly outerResamples: number;
  readonly innerResamples: number;
  readonly seed: number;
  readonly verdict: CoverageVerdict;
  /** Outer resamples whose inner CI was refused (null) — excluded from the denominator, disclosed. */
  readonly nullBands: number;
  readonly note: string;
}

export interface CoverageSelfAuditOptions {
  readonly alpha?: number; // must match the published band's alpha (default 0.05)
  readonly outerResamples?: number; // default 200
  readonly innerResamples?: number; // default 1000 (the B validated by the K1 sim)
  readonly seed?: number; // default 20260702 (the engine's fixed-seed convention)
}

/** Deterministic PRNG (mulberry32) for the OUTER loop — the package convention
 * is a local copy per module (see performance-ci.ts and its tests). */
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
 * Verdict thresholds, anchored to a decision this codebase already made in
 * production rather than an arbitrary new number: the K1 sports-shaped sim
 * measured BCa-alone under-covering at 92.2-93.7% against 95% nominal
 * (a 1.3-2.8pp gap), and that gap is exactly what made the studentized
 * corroboration load-bearing in public-roi-policy.ts. So a <=2pp gap is
 * CALIBRATED (the regime the platform already treats as acceptable-with-
 * corroboration), 2-5pp is BORDERLINE (within outer-loop Monte-Carlo noise at
 * B_outer=200, SE ~1.5pp, but too wide to call clean), and >5pp is
 * UNDERCOVERING (outside plausible MC noise — a real calibration problem on
 * this ledger's shape).
 */
function verdictFor(realized: number, nominal: number): CoverageVerdict {
  const gap = nominal - realized;
  if (gap <= 0.02) return "CALIBRATED";
  if (gap <= 0.05) return "BORDERLINE";
  return "UNDERCOVERING";
}

function runAudit(
  returns: readonly number[],
  method: Extract<CiMethod, "bca" | "studentized">,
  opts: CoverageSelfAuditOptions,
): CoverageSelfAuditResult | null {
  const alpha = opts.alpha ?? 0.05;
  const outerResamples = opts.outerResamples ?? 200;
  const innerResamples = opts.innerResamples ?? 1000;
  const seed = opts.seed ?? 20260702;
  const n = returns.length;
  if (
    n < 2 ||
    !returns.every(Number.isFinite) ||
    !Number.isInteger(outerResamples) || outerResamples < 1 ||
    !Number.isInteger(innerResamples) || innerResamples < 1 ||
    !(alpha > 0 && alpha < 1)
  ) {
    return null;
  }

  const targetMean = meanStatistic(returns);
  const rng = mulberry32(seed);
  const ciFn = method === "bca" ? bcaMeanCi : studentizedMeanCi;

  let covered = 0;
  let nullBands = 0;
  const sample = new Array<number>(n);
  for (let b = 0; b < outerResamples; b++) {
    for (let i = 0; i < n; i++) sample[i] = returns[Math.floor(rng() * n)]!;
    // Deterministic per-outer-draw inner seed: every band is independently
    // seeded yet the whole audit reproduces exactly from (ledger, seed).
    const band: PerformanceCi | null = ciFn(sample, { alpha, resamples: innerResamples, seed: seed + 1 + b });
    if (band == null) {
      nullBands++;
      continue;
    }
    if (band.low <= targetMean && targetMean <= band.high) covered++;
  }

  const denom = outerResamples - nullBands;
  const realizedCoverage = denom > 0 ? covered / denom : 0;
  const nominalCoverage = 1 - alpha;
  const verdict = denom > 0 ? verdictFor(realizedCoverage, nominalCoverage) : "UNDERCOVERING";

  const note =
    `Under ${outerResamples} resamples of our own ${n}-observation ledger, the ${method} ` +
    `${Math.round(nominalCoverage * 100)}% band covered the ledger's own mean ` +
    `${(realizedCoverage * 100).toFixed(1)}% of the time. This is a self-calibration check ` +
    `against the ledger's empirical distribution, not a claim about the true unknown population mean.`;

  return {
    method,
    n,
    targetMean,
    nominalCoverage,
    realizedCoverage,
    outerResamples,
    innerResamples,
    seed,
    verdict,
    nullBands,
    note,
  };
}

/** Self-audit the BCa band's realized coverage on this ledger. */
export function bcaCoverageSelfAudit(
  returns: readonly number[],
  opts: CoverageSelfAuditOptions = {},
): CoverageSelfAuditResult | null {
  return runAudit(returns, "bca", opts);
}

/** Self-audit the studentized (bootstrap-t) band's realized coverage on this ledger. */
export function studentizedCoverageSelfAudit(
  returns: readonly number[],
  opts: CoverageSelfAuditOptions = {},
): CoverageSelfAuditResult | null {
  return runAudit(returns, "studentized", opts);
}
