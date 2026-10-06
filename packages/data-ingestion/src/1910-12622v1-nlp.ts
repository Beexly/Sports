/**
 * Trouble with the Curve: Predicting Future MLB Players Using Scouting Reports
 *
 * arXiv:1910.12622v1 · lane:nlp · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Build the NFL analogue: collect draft-prospect scouting prose (2018-2024 classes), mask
 * names/teams/numbers, label starter-or-better by year 3, train TextCNN + HAN benchmarks, and use the
 * discriminative phrases as features in GSE's dynasty/rookie model.
 *
 * ACCEPTANCE GATE: ADOPT if masked-text AUC beats draft-position-only AUC by >=0.03 on a held-out class; REJECT if the
 * gain disappears after masking (i.e., the model was just re-learning draft slot from context clues).
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1910.12622v1" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if masked-text AUC beats draft-position-only AUC by >=0.03 on a held-out class; REJECT if the gain disappears after masking (i.e., the model was just re-learning draft slot from context clues).`;

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
