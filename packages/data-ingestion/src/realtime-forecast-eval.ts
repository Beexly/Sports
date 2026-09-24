/**
 * Evaluating realtime probabilistic forecasts with application to NBA outcome prediction
 *
 * arXiv:2010.00781v1 · lane:calibration · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * In-play calibration surfaces for GSE's live win-probability feed: build U/L calibration surfaces
 * over normalized game time (rank-based M=10 bins, Wilson-Bonferroni intervals, U^min/L^max
 * summary plots) on 2022-2025 NFL games; live skill comparison via Delta-hat_N(t) Brier skill
 * curves with conservative 95% CIs vs the pregame-strength+score logit baseline and live book
 * consensus, with Theorem 1's functional test (D=10 eigenvalues, Imhof) for the aggregate verdict,
 * pooling >=2 seasons (N>=500); fit the NFL PgRSScD-equivalent logit (pregame GSE win prob + live
 * score diff) as the in-play baseline.
 *
 * ACCEPTANCE GATE: Adopt as GSE's standard in-play evaluation if: on 2024-2025 pooled games the pipeline runs end-
 * to-end and the functional test has demonstrated power -- i.e., it significantly separates GSE
 * live from the coin-flip/HomeWP baselines (p<0.01). Reject if the surfaces/CIs are uninformative
 * on NFL data (persistent degeneracy or Wilson intervals too wide to ever exclude the reference
 * plane).
 *
 * Ingest role: feature builder (murphy decomposition: reliability, resolution, uncertainty + murphy diagram).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2010.00781v1" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt as GSE's standard in-play evaluation if: on 2024-2025 pooled games the pipeline runs end-
 * to-end and the functional test has demonstrated power -- i.e., it significantly separates GSE
 * live from the coin-flip/HomeWP baselines (p<0.01). Reject if the surfaces/CIs are uninformative
 * on NFL data (persistent degeneracy or Wilson intervals too wide to ever exclude the reference
 * plane).`;

export const CONFIG = {
  enabled: false,
  bins: 10,
  referenceModel: "climatology",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ProbOutcome {
  readonly p: number;
  readonly y: 0 | 1;
}

export function isProbOutcome(x: unknown): x is ProbOutcome {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["p"]) && (o["p"] as number) >= 0 && (o["p"] as number) <= 1 && (o["y"] === 0 || o["y"] === 1);
}

/** Brier score. */
export function brier(pairs: readonly unknown[]): number | null {
  const v: ProbOutcome[] = [];
  for (const x of pairs) if (isProbOutcome(x)) v.push(x);
  if (v.length === 0) return null;
  return v.reduce((s, e) => s + (e.p - e.y) ** 2, 0) / v.length;
}

/**
 * Murphy decomposition of the Brier score:
 * UNC (uncertainty) - RES (resolution) + REL (reliability).
 */
export function murphyDecomposition(
  pairs: readonly unknown[],
  nBins = 10,
): { unc: number; res: number; rel: number; brier: number } | null {
  const v: ProbOutcome[] = [];
  for (const x of pairs) if (isProbOutcome(x)) v.push(x);
  if (v.length === 0 || !Number.isInteger(nBins) || nBins <= 0) return null;
  const yBar = v.reduce((s, e) => s + e.y, 0) / v.length;
  const unc = yBar * (1 - yBar);
  const bins: ProbOutcome[][] = Array.from({ length: nBins }, () => []);
  for (const e of v) {
    const b = Math.min(nBins - 1, Math.floor(e.p * nBins));
    (bins[b] ?? []).push(e);
  }
  let rel = 0;
  let res = 0;
  for (const bin of bins) {
    if (bin.length === 0) continue;
    const pBar = bin.reduce((s, e) => s + e.p, 0) / bin.length;
    const yBarB = bin.reduce((s, e) => s + e.y, 0) / bin.length;
    const w = bin.length / v.length;
    rel += w * (pBar - yBarB) ** 2;
    res += w * (yBarB - yBar) ** 2;
  }
  const bs = unc - res + rel;
  return { unc, res, rel, brier: bs };
}

/** CORP-style reliability curve points. */
export function reliabilityCurve(
  pairs: readonly unknown[],
  nBins = 10,
): Array<{ pMean: number; yMean: number; n: number }> {
  const v: ProbOutcome[] = [];
  for (const x of pairs) if (isProbOutcome(x)) v.push(x);
  const bins: ProbOutcome[][] = Array.from({ length: nBins }, () => []);
  for (const e of v) {
    const b = Math.min(nBins - 1, Math.floor(e.p * nBins));
    (bins[b] ?? []).push(e);
  }
  return bins
    .filter((b) => b.length > 0)
    .map((bin) => ({
      pMean: bin.reduce((s, e) => s + e.p, 0) / bin.length,
      yMean: bin.reduce((s, e) => s + e.y, 0) / bin.length,
      n: bin.length,
    }));
}

/** Skill score vs a reference Brier score. */
export function brierSkillScore(bs: number, bsRef: number): number | null {
  if (![bs, bsRef].every(isFiniteNumber) || bsRef <= 0) return null;
  return 1 - bs / bsRef;
}
