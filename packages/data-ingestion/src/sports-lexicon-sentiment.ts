/**
 * Lexicon Integrated CNN Models with Attention for Sentiment Analysis
 *
 * arXiv:1610.06272v2 · lane:nlp · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build a sports-domain lexicon-integrated CNN as GSE's cheap always-on sentiment classifier: seed
 * from the paper's six-lexicon approach plus NFL terms (injury, questionable, doubtful, breakout,
 * bust, limited, DNP), train the SC-EAV/NC-EAV CNN with attention on labeled sports tweets
 * (bullish/bearish/neutral on a player/team), compare against zero-shot LLM labeling on cost x
 * accuracy, and deploy the CNN as the always-on cheap classifier with the LLM as escalation.
 *
 * ACCEPTANCE GATE: ADAPT if the sports-lexicon CNN matches the paper's stability pattern (run-to-run SD under 0.6)
 * and beats the plain CNN on sports text; REJECT if gains don't replicate on sports-domain text
 * (lexicon coverage problem dominates).
 *
 * Ingest role: parser (cheap always-on sports sentiment classifier; LLM escalation outside).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1610.06272v2" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if the sports-lexicon CNN matches the paper's stability pattern (run-to-run SD under 0.6)
 * and beats the plain CNN on sports text; REJECT if gains don't replicate on sports-domain text
 * (lexicon coverage problem dominates).`;

export const CONFIG = {
  enabled: false,
  architecture: "SC-EAV/NC-EAV",
  runToRunSdMax: 0.6,
  escalation: "llm",
} as const;

/**
 * Sports-domain seed lexicon (paper's six-lexicon approach + NFL terms).
 * Positive = bullish on the player/team, negative = bearish.
 */
export const NFL_LEXICON: Readonly<Record<string, number>> = {
  breakout: 0.8,
  elite: 0.7,
  full: 0.4,
  "full participant": 0.7,
  practicing: 0.3,
  cleared: 0.6,
  injury: -0.7,
  injured: -0.8,
  questionable: -0.5,
  doubtful: -0.85,
  out: -0.9,
  dnp: -0.9,
  "did not practice": -0.9,
  limited: -0.45,
  bust: -0.8,
  benched: -0.7,
  worried: -0.4,
  concern: -0.4,
  smash: 0.6,
  dud: -0.6,
};

/** Lexicon hit scores in sentence order (unigrams + bigrams). */
export function lexiconHits(text: string, lexicon: Readonly<Record<string, number>> = NFL_LEXICON): number[] {
  const lower = ` ${text.toLowerCase().replace(/[^a-z\s]/g, " ")} `;
  const hits: Array<{ idx: number; score: number }> = [];
  for (const [term, score] of Object.entries(lexicon)) {
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(` ${term} `, from);
      if (idx === -1) break;
      hits.push({ idx, score });
      from = idx + 1;
    }
  }
  hits.sort((a, b) => a.idx - b.idx);
  return hits.map((h) => h.score);
}

/** Softmax attention over hit scores (the paper's attention integration, lite). */
export function attentionWeights(scores: readonly number[]): number[] {
  if (scores.length === 0) return [];
  const m = Math.max(...scores.map(Math.abs));
  const exps = scores.map((s) => Math.exp(s - m));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}

/** Attention-pooled lexicon sentiment in [-1, 1]. */
export function lexiconSentiment(text: string, lexicon: Readonly<Record<string, number>> = NFL_LEXICON): number {
  const hits = lexiconHits(text, lexicon);
  if (hits.length === 0) return 0;
  const w = attentionWeights(hits);
  let s = 0;
  for (let i = 0; i < hits.length; i++) s += (w[i] ?? 0) * (hits[i] ?? 0);
  return Math.max(-1, Math.min(1, s));
}

export type SentimentLabel = "bullish" | "bearish" | "neutral";

/** Classify with a neutral deadband. */
export function classifySentiment(text: string, deadband = 0.15): SentimentLabel {
  const s = lexiconSentiment(text);
  if (s > deadband) return "bullish";
  if (s < -deadband) return "bearish";
  return "neutral";
}
