/**
 * Exploiting oddsmaker bias to improve the prediction of NFL outcomes
 *
 * arXiv:1710.06551v2 · lane:win_spread_total · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the oddsmaker-bias entropy filter as a pre-game batch filter: multi-season NFL closing
 * spreads + outcomes (nflverse betting data / Odds API historical, 2010-2025); estimate
 * p(margin|s) per spread value via KDE or empirical histograms with proper smoothing; compute
 * H(s); select spreads with H(s) below a data-driven threshold (chosen by cross-validation on
 * pre-2018 data, not visually); wager rule = argmax side of p(o|s); training protocol: strict
 * walk-forward -- estimate entropy/thresholds on seasons <=Y, test on Y+1..Y+2, roll forward;
 * outputs the subset of spread values currently exhibiting low conditional entropy, feeding the
 * pick-selection layer.
 *
 * ACCEPTANCE GATE: ADOPT the entropy filter as a GSE pick-selection input if, on the 2016-2024 walk-forward, the
 * k-lowest-entropy rule achieves positive ROI at -110 with >=200 wagers AND beats the wager-all
 * baseline by >=2 ROI points; REJECT otherwise.
 *
 * Ingest role: feature builder (low-conditional-entropy spread pre-game filter).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1710.06551v2" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the entropy filter as a GSE pick-selection input if, on the 2016-2024 walk-forward, the
 * k-lowest-entropy rule achieves positive ROI at -110 with >=200 wagers AND beats the wager-all
 * baseline by >=2 ROI points; REJECT otherwise.`;

export const CONFIG = {
  enabled: false,
  thresholdSelection: "cross-validation pre-2018",
  protocol: "strict walk-forward",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface SpreadGame {
  readonly spread: number;
  readonly margin: number;
}

export function isSpreadGame(x: unknown): x is SpreadGame {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["spread"]) && isFiniteNumber(o["margin"]);
}

/** Empirical pmf of margins at one spread value (histogram with smoothing). */
export function marginPMF(margins: readonly number[], smoothing = 0.5): Map<number, number> | null {
  if (margins.length === 0 || !isFiniteNumber(smoothing) || smoothing < 0) return null;
  if (!margins.every(isFiniteNumber)) return null;
  const counts = new Map<number, number>();
  for (const m of margins) counts.set(m, (counts.get(m) ?? 0) + 1);
  const pmf = new Map<number, number>();
  const n = margins.length;
  const k = counts.size;
  for (const [m, c] of counts) pmf.set(m, (c + smoothing) / (n + smoothing * k));
  return pmf;
}

/** Shannon entropy of a pmf (nats). */
export function entropy(pmf: ReadonlyMap<number, number>): number | null {
  if (pmf.size === 0) return null;
  let h = 0;
  for (const p of pmf.values()) {
    if (!isFiniteNumber(p) || p < 0) return null;
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}

/** H(s) per spread value + argmax side of p(margin > s). */
export function conditionalEntropyBySpread(games: readonly unknown[]): Array<{
  spread: number;
  entropy: number;
  pHomeCover: number;
  n: number;
}> {
  const bySpread = new Map<number, number[]>();
  for (const g of games) {
    if (!isSpreadGame(g)) continue;
    const l = bySpread.get(g.spread) ?? [];
    l.push(g.margin);
    bySpread.set(g.spread, l);
  }
  const out: Array<{ spread: number; entropy: number; pHomeCover: number; n: number }> = [];
  for (const [spread, margins] of bySpread) {
    const pmf = marginPMF(margins);
    const h = pmf ? entropy(pmf) : null;
    if (h === null) continue;
    const cover = margins.filter((m) => m + spread > 0).length / margins.length;
    out.push({ spread, entropy: h, pHomeCover: cover, n: margins.length });
  }
  out.sort((a, b) => a.spread - b.spread);
  return out;
}

/** k lowest-entropy spreads under the CV-chosen threshold. */
export function lowEntropySpreads(
  rows: ReturnType<typeof conditionalEntropyBySpread>,
  threshold: number,
  k: number,
): number[] {
  if (!isFiniteNumber(threshold) || !isFiniteNumber(k) || k <= 0) return [];
  return rows
    .filter((r) => r.entropy < threshold)
    .sort((a, b) => a.entropy - b.entropy)
    .slice(0, k)
    .map((r) => r.spread);
}

/** Wager rule: argmax side of p(outcome | spread). */
export function argmaxSide(pHomeCover: number): "home" | "away" | null {
  if (!isFiniteNumber(pHomeCover) || pHomeCover < 0 || pHomeCover > 1) return null;
  return pHomeCover >= 0.5 ? "home" : "away";
}
