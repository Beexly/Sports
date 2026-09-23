/**
 * Sports Intelligence: Assessing the Sports Understanding Capabilities of Language Models through Question Answering from Text to Video
 *
 * arXiv:2406.14877 · lane:nlp · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Build an NFL-live multi-hop question benchmark auto-generated from fresh game logs (win-probability
 * swings plus down/distance/clock/score context) as a contamination-proof regression test for GSE's
 * content pipeline, using the paper's error taxonomy (nuance confusion, reasoning errors) to route
 * chained sports reasoning to human review where the human gap is quantified.
 *
 * ACCEPTANCE GATE: ADAPT — not a method to adopt but the evaluation discipline GSE's NLP lane was missing: a concrete
 * error taxonomy, a prompting standard with measured gains, and a quantified human-gap that justifies
 * human review on chained sports reasoning.
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2406.14877" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT — not a method to adopt but the evaluation discipline GSE's NLP lane was missing: a concrete error taxonomy, a prompting standard with measured gains, and a quantified human-gap that justifies human review on chained sports reasoning.`;

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
