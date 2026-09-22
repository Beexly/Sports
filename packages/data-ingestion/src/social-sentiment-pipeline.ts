/**
 * Social Media Sentiment Analysis for Cryptocurrency Market Prediction
 *
 * arXiv:2204.10185v1 · lane:nlp · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the news-sentiment -> projection-error channel: collect 2024-season player/team sentiment
 * from X + beat-writer RSS with a fixed lexicon (CNN channel included), compute per-entity daily
 * metrics incl. the contradictive compound and a cross-channel disagreement metric (sentiment
 * variance — disagreement, not level, as the mispricing predictor), test lagged correlation with
 * next-week projection error at 1-7 day lags under nested walk-forward CV (refit quarterly), then
 * lock the compound indicator and evaluate on 2025.
 *
 * ACCEPTANCE GATE: ADAPT into the projection pipeline iff the locked 2025 evaluation shows |r| >= 0.10 with the
 * correct sign and the indicator adds RMSE improvement in a bivariate blend; REJECT if out-of-
 * sample |r| < 0.05 (signal was selection artifact).
 *
 * Ingest role: connector interface (social sentiment pipeline: schema + lexicon scorer; default OFF).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2204.10185v1" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT into the projection pipeline iff the locked 2025 evaluation shows |r| >= 0.10 with the
 * correct sign and the indicator adds RMSE improvement in a bivariate blend; REJECT if out-of-
 * sample |r| < 0.05 (signal was selection artifact).`;

export const CONFIG = {
  enabled: false,
  source: "social media",
  windowH: 72,
  lexicon: "seed word lists",
} as const;

export const SEED_LEXICON: Readonly<Record<string, number>> = {
  bullish: 1, moon: 1, breakout: 1, strong: 0.8, win: 0.8,
  bearish: -1, crash: -1, weak: -0.8, loss: -0.8, injury: -0.6,
};

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface SocialPost {
  readonly postId: string;
  readonly team: string;
  readonly postedAt: string;
  readonly text: string;
}

export function isSocialPost(x: unknown): x is SocialPost {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["postId"] === "string" &&
    typeof o["team"] === "string" &&
    typeof o["postedAt"] === "string" && Number.isFinite(Date.parse(o["postedAt"] as string)) &&
    typeof o["text"] === "string"
  );
}

/** Lexicon sentiment score in [-1, 1]. */
export function lexiconScore(text: string, lexicon: Readonly<Record<string, number>> = SEED_LEXICON): number | null {
  if (typeof text !== "string") return null;
  const toks = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (toks.length === 0) return null;
  let s = 0;
  let hits = 0;
  for (const t of toks) {
    const v = lexicon[t];
    if (v !== undefined && isFiniteNumber(v)) {
      s += v;
      hits++;
    }
  }
  if (hits === 0) return 0;
  return Math.max(-1, Math.min(1, s / Math.sqrt(hits)));
}

/** Aggregate team sentiment over the pre-game window. */
export function teamSentiment(
  posts: readonly unknown[],
  team: string,
  windowStartISO: string,
  windowEndISO: string,
): { n: number; mean: number | null } {
  const start = Date.parse(windowStartISO);
  const end = Date.parse(windowEndISO);
  const scores: number[] = [];
  let n = 0;
  for (const p of posts) {
    if (!isSocialPost(p) || p.team !== team) continue;
    const t = Date.parse(p.postedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || t < start || t > end) continue;
    n++;
    const s = lexiconScore(p.text);
    if (s !== null) scores.push(s);
  }
  return { n, mean: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null };
}

/** Chi-square-ish term salience for top-k bigram mining (offline recipe hook). */
export function termSalience(termCount: number, teamCount: number, totalTerms: number, totalTeam: number): number | null {
  if (![termCount, teamCount, totalTerms, totalTeam].every(isFiniteNumber)) return null;
  if (termCount <= 0 || totalTerms <= 0 || totalTeam <= 0 || teamCount > termCount) return null;
  const expected = (termCount / totalTerms) * totalTeam;
  if (expected === 0) return null;
  return ((teamCount - expected) ** 2) / expected;
}
