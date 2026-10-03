/**
 * Deep Artificial Intelligence for Fantasy Football Language Understanding
 *
 * arXiv:2111.02874v1 · lane:nlp · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Stand up the fantasy-news NLP pilot: ingest ~500 beat-writer RSS/X lists/podcast transcripts, NER
 * for players/teams/injuries, calibrated classifier heads for the four fixed-definition labels
 * (boom/bust/injury-out/sit) trained with proper scoring rules + isotonic recalibration, then blend
 * calibrated probabilities (not hard labels) as a shrinkage prior into GSE projections; evaluate on
 * full 2025-season RMSE backtest.
 *
 * ACCEPTANCE GATE: ADOPT into production iff the combined projections beat GSE's baseline RMSE on the full 2025
 * backtest with p<0.05 (paired Diebold-Mariano); REJECT if the NLP adjustment is directionally
 * inconsistent (worse RMSE like the paper's 6.92) or label precision doesn't exceed base rates.
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2111.02874v1" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT into production iff the combined projections beat GSE's baseline RMSE on the full 2025 backtest with p<0.05 (paired Diebold-Mariano); REJECT if the NLP adjustment is directionally inconsistent (worse RMSE like the paper's 6.92) or label precision doesn't exceed base rates.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "lexicon scoring + keyword overlap on normalized tokens",
} as const;

/** Lowercase alphanumeric tokenization. */
export function tokenize(text: string): string[] | null {
  if (typeof text !== "string") return null;
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

export interface LexiconHit {
  hits: number;
  /** Sum of matched lexicon weights, normalized by token count. */
  score: number;
}

/** Sum lexicon weights over matched tokens, normalized by token count. */
export function lexiconScore(
  tokens: readonly string[],
  lexicon: Readonly<Record<string, number>>,
): LexiconHit | null {
  if (tokens.length === 0) return null;
  if (!tokens.every((t) => typeof t === "string")) return null;
  let hits = 0;
  let sum = 0;
  for (const t of tokens) {
    const w = lexicon[t];
    if (w !== undefined) {
      if (!Number.isFinite(w)) return null;
      hits++;
      sum += w;
    }
  }
  return { hits, score: sum / tokens.length };
}

/** Jaccard overlap of two token sets. */
export function keywordOverlap(a: readonly string[], b: readonly string[]): number | null {
  if (a.length === 0 && b.length === 0) return null;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? null : inter / union;
}
