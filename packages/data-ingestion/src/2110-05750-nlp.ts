/**
 * SportsSum2.0: Generating High-Quality Sports News from Live Text Commentary
 *
 * arXiv:2110.05750 · lane:nlp · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Adapt the three-step SportsSum2.0 pipeline to NFL English text streams: (a) pseudo-label beat-writer
 * articles to play-by-play/injury-report sentences using the S = lambda*BERTScore + (1-lambda)*ROUGE
 * recipe inside timestamp windows; (b) train a context-aware selector (RoBERTa/DeBERTa) over rolling
 * windows of X posts/articles to extract signal sentences; (c) rewrite with a modern seq2seq LLM and
 * rerank with fluency-aware MMR (perplexity from the LLM itself) to assemble daily NFL recap briefs,
 * injury digest posts, or @GalaxySportsHQ content drafts; budget = target post length.
 *
 * ACCEPTANCE GATE: ACCEPTED (ADAPT): clean public dataset + reproduced SOTA + ablations isolating all three
 * contributions. NFL-port gate: the selector's recall on pseudo-labeled NFL sentences must match the
 * paper's ordering (selector + rewrite + MMR rerank beats each ablated variant).
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2110.05750" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ACCEPTED (ADAPT): clean public dataset + reproduced SOTA + ablations isolating all three contributions. NFL-port gate: the selector's recall on pseudo-labeled NFL sentences must match the paper's ordering (selector + rewrite + MMR rerank beats each ablated variant).`;

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
