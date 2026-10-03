/**
 * Sentiment Analysis of Twitter Data for Predicting Stock Market Movements
 *
 * arXiv:1610.09225v1 · lane:markets · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adapt the Twitter sentiment pipeline to betting markets: aggregate X sentiment per team (3-day
 * pre-game window, per the paper's finding) -> predict line movement direction (steam) rather than
 * price direction; sentiment classifier = fine-tuned modern embeddings on sports tweets; direction
 * model = logistic regression on sentiment counts + baseline market features.
 *
 * ACCEPTANCE GATE: ADOPT if time-ordered AUC gain >= 0.02 over the no-sentiment baseline; REJECT if the gain
 * vanishes once injury-report dummies are included (likely confound -- sentiment may just proxy
 * news).
 *
 * Ingest role: feature builder (X sentiment -> line-movement direction model).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1610.09225v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if time-ordered AUC gain >= 0.02 over the no-sentiment baseline; REJECT if the gain
 * vanishes once injury-report dummies are included (likely confound -- sentiment may just proxy
 * news).`;

export const CONFIG = {
  enabled: false,
  windowDays: 3,
  aucGainThreshold: 0.02,
  confoundCheck: "injury-report dummies",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface SentimentWindow {
  readonly gameId: string;
  readonly pos: number;
  readonly neg: number;
  readonly neu: number;
  readonly baseline: readonly number[];
}

export function isSentimentWindow(x: unknown): x is SentimentWindow {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["gameId"] === "string" &&
    isFiniteNumber(o["pos"]) && (o["pos"] as number) >= 0 &&
    isFiniteNumber(o["neg"]) && (o["neg"] as number) >= 0 &&
    isFiniteNumber(o["neu"]) && (o["neu"] as number) >= 0 &&
    Array.isArray(o["baseline"]) && (o["baseline"] as unknown[]).every(isFiniteNumber)
  );
}

/** Feature vector: sentiment counts + baseline market features. */
export function steamFeatures(w: SentimentWindow): number[] {
  const n = w.pos + w.neg + w.neu;
  const net = n > 0 ? (w.pos - w.neg) / n : 0;
  const volume = Math.log1p(n);
  return [net, volume, w.pos, w.neg, ...w.baseline];
}

/** Logistic P(line moves toward the sentiment side). */
export function logisticPredict(features: readonly number[], weights: readonly number[], bias: number): number | null {
  if (features.length !== weights.length) return null;
  if (!features.every(isFiniteNumber) || !weights.every(isFiniteNumber) || !isFiniteNumber(bias)) return null;
  let z = bias;
  for (let i = 0; i < features.length; i++) z += (features[i] ?? 0) * (weights[i] ?? 0);
  return 1 / (1 + Math.exp(-z));
}

/** Direction label from line movement: 1 if close moved with sentiment. */
export function moveDirectionLabel(open: number, close: number, sentimentNet: number): 0 | 1 | null {
  if (![open, close, sentimentNet].every(isFiniteNumber)) return null;
  const move = close - open;
  if (move === 0 || sentimentNet === 0) return null;
  return Math.sign(move) === Math.sign(sentimentNet) ? 1 : 0;
}

/** AUC via Mann-Whitney (time-ordered evaluation input). Null on degenerate. */
export function auc(scores: readonly number[], labels: readonly number[]): number | null {
  if (scores.length !== labels.length || scores.length === 0) return null;
  const pos = scores.filter((_, i) => labels[i] === 1);
  const neg = scores.filter((_, i) => labels[i] === 0);
  if (pos.length === 0 || neg.length === 0) return null;
  let wins = 0;
  for (const p of pos) for (const n of neg) {
    if (p > n) wins += 1;
    else if (p === n) wins += 0.5;
  }
  return wins / (pos.length * neg.length);
}
