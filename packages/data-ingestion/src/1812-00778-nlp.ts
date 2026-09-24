/**
 * 1721 FTR-18: collecting rumours on football transfer news
 *
 * arXiv:1812.00778 · lane:nlp · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Lightweight text signal extraction for reports and commentary: lowercase alphanumeric tokenization,
 * lexicon-weighted sentiment scoring normalized by token count, and Jaccard keyword overlap for
 * near-duplicate and similarity checks.
 *
 * Improvement (wiring record): Build gse/rumors/ on the FTR-18 five-stage rumor pipeline taxonomy, retargeted at NFL trade rumors,
 * coaching-move rumors, and injury-report rumors: (1) detection -- classify news items as rumor vs
 * confirmed-report using the paper's hedging lexicon ('sources say', 'expected to', 'game-time
 * decision') + source features; (2) tracking -- cluster articles/posts to rumor threads (same player +
 * move type); (3) stance -- per-item orientation (supporting/denying/observing) toward the claim; (4)
 * veracity -- resolve against official ground truth (roster transactions, inactive lists, team
 * announcements) with a resolution deadline; (5) evidence retrieval -- surface supporting/refuting
 * items per rumor. Maintain a rumor registry (claim, entities, first-seen, sources, stance
 * distribution, hedging score, status unresolved/confirmed/refuted, resolved-by). Score every ingested
 * rumor with a hedging index that down-weights its influence in downstream models. Improvement: run
 * the experiments the paper never delivers -- (1) ablate hedging-pattern features in a
 * rumor-confirmation classifier (paper's core linguistic claim becomes empirical if hedging adds >=5
 * pp accuracy); (2) source-attribution graph measuring the echo effect -- what fraction of
 * 'confirmations' trace to a single origin vs independent reporting -- converting the echo observation
 * into a rumor-credibility discount; (3) extend veracity ground truth beyond transfers to injury
 * rumors (official status reports) and coaching rumors (team announcements).
 *
 * ACCEPTANCE GATE: ADAPT the pipeline taxonomy, the hedging lexicon, and the official-registration veracity protocol;
 * adopt nothing empirical since the paper runs no experiments. ADAPT proceeds if the reproducible test
 * validates the hedging-index hypothesis (rho <= -0.3) and veracity accuracy >= 0.80; REJECT the
 * Twitter-reaction side if reaction-volume data is unavailable or too sparse per rumor (the paper's 2M
 * tweets came from a 2018 API that no longer exists); REJECT any veracity claim on 'talks died
 * quietly' rumors where no official ground truth exists -- mark those unresolved, never refuted.
 *
 * Ingest role: text feature extraction (tokenization, lexicon scoring, keyword overlap).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1812.00778" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the pipeline taxonomy, the hedging lexicon, and the official-registration veracity protocol; adopt nothing empirical since the paper runs no experiments. ADAPT proceeds if the reproducible test validates the hedging-index hypothesis (rho <= -0.3) and veracity accuracy >= 0.80; REJECT the Twitter-reaction side if reaction-volume data is unavailable or too sparse per rumor (the paper's 2M tweets came from a 2018 API that no longer exists); REJECT any veracity claim on 'talks died quietly' rumors where no official ground truth exists -- mark those unresolved, never refuted.`;

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
