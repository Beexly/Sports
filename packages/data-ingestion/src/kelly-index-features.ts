/**
 * Predicting Football Match Outcomes with eXplainable Machine Learning and the Kelly Index
 *
 * arXiv:2211.15734v1 · lane:markets · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add a 'market difficulty' classifier to the pick pipeline: compute a per-game Kelly-style index
 * across US books (book odds / market mean x payout rate), classify games easy/medium/hard, train
 * confidence calibration separately per class, and gate published picks (easy + engine confidence
 * >=70% -> full unit; medium -> half unit or pass; hard -> pass); backtest on 2020-2024 NFL ATS vs
 * closing lines — then replace the count-of-bookmakers rule with a continuous difficulty score
 * (entropy of the de-vigged consensus + max Kelly index) and fit the confidence threshold by
 * maximizing backtested Sharpe per season via walk-forward optimization, testing threshold
 * stability across seasons.
 *
 * ACCEPTANCE GATE: Adopt the difficulty classifier iff the backtest shows gated picks beat ungated on ROI by >=3
 * percentage points with CLV>0 over 2020-2024; keep as monitoring metric only otherwise.
 *
 * Ingest role: feature builder (Kelly-index explainable features: bookmaker-weighted win probs).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2211.15734v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the difficulty classifier iff the backtest shows gated picks beat ungated on ROI by >=3
 * percentage points with CLV>0 over 2020-2024; keep as monitoring metric only otherwise.`;

export const CONFIG = {
  enabled: false,
  method: "Kelly index + SHAP-lite explanations",
  books: ["pinnacle", "bet365", "draftkings"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface BookOdds {
  readonly book: string;
  readonly home: number;
  readonly draw: number;
  readonly away: number;
}

export function isBookOdds(x: unknown): x is BookOdds {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["book"] === "string" &&
    [o["home"], o["draw"], o["away"]].every((v) => isFiniteNumber(v) && (v as number) > 1)
  );
}

/** De-vigged probabilities (multiplicative method). */
export function devigged(odds: BookOdds): { home: number; draw: number; away: number } | null {
  if (!isBookOdds(odds)) return null;
  const raw = [1 / odds.home, 1 / odds.draw, 1 / odds.away];
  const tot = raw[0]! + raw[1]! + raw[2]!;
  return { home: raw[0]! / tot, draw: raw[1]! / tot, away: raw[2]! / tot };
}

/** Kelly index per outcome: book prob / mean book prob (paper's K_H, K_D, K_A). */
export function kellyIndex(books: readonly unknown[]): Array<{ book: string; kHome: number; kDraw: number; kAway: number }> | null {
  const v: BookOdds[] = [];
  for (const b of books) if (isBookOdds(b)) v.push(b);
  if (v.length === 0) return null;
  const ps = v.map(devigged);
  if (ps.some((p) => p === null)) return null;
  const mean = {
    home: ps.reduce((s, p) => s + (p?.home ?? 0), 0) / ps.length,
    draw: ps.reduce((s, p) => s + (p?.draw ?? 0), 0) / ps.length,
    away: ps.reduce((s, p) => s + (p?.away ?? 0), 0) / ps.length,
  };
  return v.map((b, i) => {
    const p = ps[i]!;
    return {
      book: b.book,
      kHome: mean.home > 0 ? (p?.home ?? 0) / mean.home : 0,
      kDraw: mean.draw > 0 ? (p?.draw ?? 0) / mean.draw : 0,
      kAway: mean.away > 0 ? (p?.away ?? 0) / mean.away : 0,
    };
  });
}

/** Consensus (mean) de-vigged probabilities. */
export function consensusProb(books: readonly unknown[]): { home: number; draw: number; away: number } | null {
  const v: BookOdds[] = [];
  for (const b of books) if (isBookOdds(b)) v.push(b);
  if (v.length === 0) return null;
  const ps = v.map(devigged);
  if (ps.some((p) => p === null)) return null;
  return {
    home: ps.reduce((s, p) => s + (p?.home ?? 0), 0) / ps.length,
    draw: ps.reduce((s, p) => s + (p?.draw ?? 0), 0) / ps.length,
    away: ps.reduce((s, p) => s + (p?.away ?? 0), 0) / ps.length,
  };
}

/** Kelly-index dispersion: std of K across books (market disagreement feature). */
export function kellyDispersion(books: readonly unknown[]): number | null {
  const ki = kellyIndex(books);
  if (!ki || ki.length < 2) return null;
  const all = ki.flatMap((k) => [k.kHome, k.kDraw, k.kAway]);
  const m = all.reduce((a, b) => a + b, 0) / all.length;
  return Math.sqrt(all.reduce((a, v) => a + (v - m) * (v - m), 0) / all.length);
}
