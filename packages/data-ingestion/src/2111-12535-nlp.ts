/**
 * Knowledge Enhanced Sports Game Summarization
 *
 * arXiv:2111.12535 · lane:nlp · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Adapt KES to English NFL content: build the knowledge corpus (32 teams + ~1700 active players as
 * structured cards: bio, contract, season stats, injury history), NER + entity linking over game
 * rosters, inject knowledge via z_seg/z_know embedding fusion into the seq2seq generator — adding the
 * missing faithfulness guard the paper lacked: entailment-check every injected fact against its
 * knowledge card before emission.
 *
 * ACCEPTANCE GATE: ACCEPTED (ADAPT): largest human-cleaned dataset of its kind + quantified knowledge gap + ablated
 * knowledge-fusion method. NFL-port gate: recaps with knowledge fusion rated more informative than the
 * knowledge-blind baseline with zero entailed-fact errors on a 50-game sample.
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2111.12535" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ACCEPTED (ADAPT): largest human-cleaned dataset of its kind + quantified knowledge gap + ablated knowledge-fusion method. NFL-port gate: recaps with knowledge fusion rated more informative than the knowledge-blind baseline with zero entailed-fact errors on a 50-game sample.`;

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
