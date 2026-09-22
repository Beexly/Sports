/**
 * Not feeling the buzz: Correction study of mispricing and inefficiency in online sportsbooks
 *
 * arXiv:2306.01740v4 · lane:markets · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * As engine-honesty infrastructure, install an odds QA and evaluation protocol: (1) odds-sanity
 * filter in the market-capture pipeline - drop/flag any row where a book's quote exceeds the
 * cross-book best by more than 3 SD of the best-minus-mean spread, and any single-book line that
 * is an extreme outlier vs consensus (z-score on implied probability), before backtest data is
 * written; (2) adopt the random-betting bootstrap (100k trials) as the mandatory significance
 * screen for any published GSE strategy P&L - report p_bs alongside ROI, never post a strategy
 * with p_bs > 0.05; (3) cap per-bet Kelly fractions (<= 0.25x full Kelly) to bound single-row
 * data-error damage; (4) extend the paper with an NFL 'buzz factor': Mincer-Zarnowitz mispricing
 * regression on NFL moneylines using a crowd-attention proxy (beat-writer/news volume + X
 * engagement 48h before kickoff) plus a rank/Elo-distance term.
 *
 * ACCEPTANCE GATE: ADOPT the QA protocol (no further test needed - the filters are cheap insurance); for the
 * reproducible test: if dropping flagged odds rows changes the 2025 backtest ROI of any published
 * GSE strategy by more than +/-2 pp, or flips any strategy from p_bs < 0.05 to > 0.05, treat the
 * published P&L as data-error-contaminated and re-issue corrected figures before posting any new
 * picks.
 *
 * Ingest role: schemas (sportsbook mispricing correction study: audit schema + bias tests).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2306.01740v4" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the QA protocol (no further test needed - the filters are cheap insurance); for the
 * reproducible test: if dropping flagged odds rows changes the 2025 backtest ROI of any published
 * GSE strategy by more than +/-2 pp, or flips any strategy from p_bs < 0.05 to > 0.05, treat the
 * published P&L as data-error-contaminated and re-issue corrected figures before posting any new
 * picks.`;

export const CONFIG = {
  enabled: false,
  study: "mispricing correction",
  markets: ["moneyline", "spread", "total"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface BookLine {
  readonly gameId: string;
  readonly market: string;
  readonly book: string;
  readonly price: number;
  readonly impliedProb: number;
  readonly realized: 0 | 1 | null;
}

export function isBookLine(x: unknown): x is BookLine {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["gameId"] === "string" &&
    typeof o["market"] === "string" &&
    typeof o["book"] === "string" &&
    isFiniteNumber(o["price"]) && (o["price"] as number) > 1 &&
    isFiniteNumber(o["impliedProb"]) && (o["impliedProb"] as number) > 0 && (o["impliedProb"] as number) < 1 &&
    (o["realized"] === 0 || o["realized"] === 1 || o["realized"] === null)
  );
}

/** Calibration slope of realized on implied prob (1 = fair). */
export function mispricingSlope(lines: readonly unknown[]): { slope: number; intercept: number } | null {
  const v: Array<{ p: number; y: number }> = [];
  for (const l of lines) {
    if (!isBookLine(l) || l.realized === null) continue;
    v.push({ p: l.impliedProb, y: l.realized });
  }
  if (v.length < 2) return null;
  const mp = v.reduce((s, e) => s + e.p, 0) / v.length;
  const my = v.reduce((s, e) => s + e.y, 0) / v.length;
  let num = 0;
  let den = 0;
  for (const e of v) {
    num += (e.p - mp) * (e.y - my);
    den += (e.p - mp) * (e.p - mp);
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mp };
}

/** Favorite-longshot bias: slope < 1 means longshots overpriced. */
export function flbDiagnosis(slope: number): "longshots-overpriced" | "favorites-overpriced" | "fair" | null {
  if (!isFiniteNumber(slope)) return null;
  if (Math.abs(slope - 1) < 0.05) return "fair";
  return slope < 1 ? "longshots-overpriced" : "favorites-overpriced";
}

/** Book-level bias audit. */
export function bookBiasAudit(lines: readonly unknown[]): Record<string, { n: number; slope: number | null }> {
  const groups = new Map<string, unknown[]>();
  for (const l of lines) {
    if (!isBookLine(l)) continue;
    const g = groups.get(l.book) ?? [];
    g.push(l);
    groups.set(l.book, g);
  }
  const out: Record<string, { n: number; slope: number | null }> = {};
  for (const [b, ls] of groups) {
    const s = mispricingSlope(ls);
    out[b] = { n: ls.length, slope: s ? s.slope : null };
  }
  return out;
}
