/**
 * Combining Machine Learning and Human Experts to Predict Match Outcomes in Football: A Baseline Model
 *
 * arXiv:2012.04380v1 · lane:nlp · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Beat-writer text feature pipeline for NFL: scrape pre-game beat-writer articles (ESPN team writers,
 * The Athletic, local beats) per matchup; sentence-transformer embeddings with sentence->team
 * allocation via an entity-linking/NER pass; per-team aggregate vectors (sum/attention-weighted);
 * ensemble-only design -- feed text-model outcome probabilities as meta-features into a stacking
 * classifier alongside GSE engine probabilities and de-vigged market probabilities (the paper proves
 * the ensemble-only value); props extension: player-level text (injury reports, rotation news) as
 * features for prop/fantasy projections.
 *
 * ACCEPTANCE GATE: Reproduce the paper's Model 4 ~= 63% accuracy and the >=7pp ablation drop when text features are
 * removed; NFL pilot: 1 season of beat-writer previews with the same stacking protocol vs the GSE
 * engine baseline, measuring moneyline accuracy delta and CLV on the subset where the text model
 * disagrees with the market.
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2012.04380v1" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Reproduce the paper's Model 4 ~= 63% accuracy and the >=7pp ablation drop when text features are removed; NFL pilot: 1 season of beat-writer previews with the same stacking protocol vs the GSE engine baseline, measuring moneyline accuracy delta and CLV on the subset where the text model disagrees with the market.`;

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
