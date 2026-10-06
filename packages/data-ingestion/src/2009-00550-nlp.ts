/**
 * 1714 Using social networks to improve group transition prediction in professional sports
 *
 * arXiv:2009.00550 · lane:nlp · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Build gse/offseason/social_affinity.py: ingest timestamped follow-graph snapshots (never a single
 * current snapshot); for each pending NFL free agent compute per-team affinity from follows created
 * before the tampering window; combine with existing transition features (cap space, team need,
 * prior-team link, agent representation) in a gradient-boosted destination classifier outputting a
 * destination distribution over 32 teams as a prior in the player-value and team-total adjustment
 * pipeline; guardrail: any follow edge without a creation timestamp is excluded (the paper's failure
 * mode).
 *
 * ACCEPTANCE GATE: ADAPT only the recipe -- timestamped per-team social-affinity features inside a walk-forward
 * destination classifier -- if the reproducible test shows >= 2x-random top-3 accuracy on NFL data
 * with strictly pre-tampering-window features. REJECT the paper's numbers outright if timestamped
 * follow data is unobtainable (without edge timestamps the feature is definitionally leaky).
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2009.00550" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT only the recipe -- timestamped per-team social-affinity features inside a walk-forward destination classifier -- if the reproducible test shows >= 2x-random top-3 accuracy on NFL data with strictly pre-tampering-window features. REJECT the paper's numbers outright if timestamped follow data is unobtainable (without edge timestamps the feature is definitionally leaky).`;

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
