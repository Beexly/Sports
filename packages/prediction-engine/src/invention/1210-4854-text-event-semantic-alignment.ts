/**
 * 1210.4854 — Semantic Understanding of Professional Soccer Commentaries
 * (ADAPT → NFL beat-reporter tweet ↔ play-by-play text-to-event alignment)
 *
 * ADDITIVE invention scaffold. Disabled by default. Does not alter scoring,
 * confidence, publish gates, or MODEL_VERSION. Architecture + harness only —
 * no training runs, no live wire into the pick engine.
 *
 * Planned module: bi-encoder (tweet embedder vs play-description embedder)
 * trained with contrastive InfoNCE on temporal-bucket weak supervision
 * (±10-minute windows), plus a graph-attention popularity re-ranker and an
 * explicit no-event / strategy-talk head for tactics and injury framing.
 * Downstream: per-drive sentiment / availability narrative features.
 *
 * ACCEPTANCE GATE (from IMPROVEMENT-LEDGER):
 *   ADOPT if alignment F1 >= 0.55 on the labeled sample
 *   AND per-drive aggregated sentiment features improve OOS spread-model
 *   log-loss on 2024 games with >= 30 beat-reporter tweets by >= 0.005.
 *
 * Source: docs/research/2026-09-21/arxiv-program/index/IMPROVEMENT-LEDGER.jsonl
 * Paper: arXiv:1210.4854
 */

/** Minimum alignment F1 required to ADOPT. */
export const ALIGNMENT_F1_FLOOR = 0.55;

/** Minimum OOS log-loss improvement (reduction) required to ADOPT. */
export const LOG_LOSS_DELTA_FLOOR = 0.005;

/** Temporal weak-supervision half-window in milliseconds (±10 minutes). */
export const TEMPORAL_BUCKET_MS = 10 * 60 * 1000;

/** Minimum beat-reporter tweets on a game for the log-loss arm. */
export const MIN_TWEETS_FOR_LOGLOSS_ARM = 30;

export interface TweetEvent {
  readonly id: string;
  readonly text: string;
  readonly postedAtMs: number;
  readonly authorId: string;
  /** Popularity proxy (likes + reposts + replies). */
  readonly popularity: number;
  /** Precomputed unit embedding; empty vector → cosine returns 0. */
  readonly embedding: readonly number[];
}

export interface PlayEvent {
  readonly playId: string;
  readonly description: string;
  readonly gameClockMs: number;
  readonly driveId: string;
  readonly embedding: readonly number[];
}

export type TweetClass = "event" | "no_event" | "strategy_talk";

export interface AlignmentCandidate {
  readonly tweetId: string;
  readonly playId: string;
  readonly biEncoderScore: number;
  readonly popularityBoost: number;
  readonly combinedScore: number;
}

export interface AlignmentDecision {
  readonly tweetId: string;
  readonly class: TweetClass;
  readonly bestPlayId: string | null;
  readonly score: number;
}

export interface DriveSentimentFeature {
  readonly driveId: string;
  readonly meanSentiment: number;
  readonly tweetCount: number;
  readonly strategyTalkShare: number;
}

export interface AlignmentEval {
  readonly f1: number;
  readonly precision: number;
  readonly recall: number;
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
}

export interface LogLossArm {
  readonly baselineLogLoss: number;
  readonly augmentedLogLoss: number;
  readonly delta: number;
  readonly tweetCount: number;
}

export interface AcceptanceGateResult {
  readonly alignmentPass: boolean;
  readonly logLossPass: boolean;
  readonly adopt: boolean;
  readonly f1: number;
  readonly logLossDelta: number;
}

/** Cosine similarity of two equal-length vectors; 0 if either is empty or dims mismatch. */
export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na <= 0 || nb <= 0) {
    return 0;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * InfoNCE-style pairwise loss on a single positive pair vs negatives.
 * Scaffold only — uses fixed temperature; no gradient step.
 */
export function infoNceLoss(
  query: readonly number[],
  positive: readonly number[],
  negatives: readonly (readonly number[])[],
  temperature = 0.07,
): number {
  const pos = cosineSimilarity(query, positive) / temperature;
  let denom = Math.exp(pos);
  for (const neg of negatives) {
    denom += Math.exp(cosineSimilarity(query, neg) / temperature);
  }
  if (denom <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return -pos + Math.log(denom);
}

/** True when tweet and play fall inside the ±TEMPORAL_BUCKET_MS weak-label window. */
export function inTemporalBucket(
  tweetPostedAtMs: number,
  playClockMs: number,
  halfWindowMs: number = TEMPORAL_BUCKET_MS,
): boolean {
  return Math.abs(tweetPostedAtMs - playClockMs) <= halfWindowMs;
}

/**
 * Graph-attention-style popularity re-rank: blend bi-encoder score with a
 * normalized popularity share among candidates for the same tweet.
 * alpha in [0, 1] weights the bi-encoder; (1-alpha) weights popularity.
 */
export function popularityRerank(
  biEncoderScore: number,
  popularity: number,
  peerPopularities: readonly number[],
  alpha = 0.7,
): number {
  const total = peerPopularities.reduce((s, p) => s + Math.max(0, p), 0);
  const share = total > 0 ? Math.max(0, popularity) / total : 0;
  const a = Math.min(1, Math.max(0, alpha));
  return a * biEncoderScore + (1 - a) * share;
}

/**
 * Score every (tweet, play) pair inside the temporal bucket, then re-rank
 * by popularity among peers for that tweet.
 */
export function scoreAlignmentCandidates(
  tweets: readonly TweetEvent[],
  plays: readonly PlayEvent[],
  halfWindowMs: number = TEMPORAL_BUCKET_MS,
  alpha = 0.7,
): AlignmentCandidate[] {
  const out: AlignmentCandidate[] = [];
  for (const tweet of tweets) {
    const inBucket = plays.filter((p) =>
      inTemporalBucket(tweet.postedAtMs, p.gameClockMs, halfWindowMs),
    );
    if (inBucket.length === 0) {
      continue;
    }
    const peerPops = inBucket.map(() => tweet.popularity);
    for (const play of inBucket) {
      const bi = cosineSimilarity(tweet.embedding, play.embedding);
      const boost = popularityRerank(bi, tweet.popularity, peerPops, alpha);
      out.push({
        tweetId: tweet.id,
        playId: play.playId,
        biEncoderScore: bi,
        popularityBoost: boost - bi,
        combinedScore: boost,
      });
    }
  }
  return out.sort((x, y) => y.combinedScore - x.combinedScore);
}

/**
 * Explicit no-event / strategy-talk head.
 * Heuristic scaffold: keyword cues + low max bi-encoder score → strategy/no_event.
 */
export function classifyTweet(
  text: string,
  maxBiEncoderScore: number,
  eventThreshold = 0.35,
): TweetClass {
  const lower = text.toLowerCase();
  const strategyCues = [
    "scheme",
    "coverage",
    "blitz",
    "play-action",
    "game plan",
    "injury",
    "questionable",
    "limited",
  ];
  const hasStrategy = strategyCues.some((c) => lower.includes(c));
  if (maxBiEncoderScore < eventThreshold) {
    return hasStrategy ? "strategy_talk" : "no_event";
  }
  return "event";
}

/** Pick the best play per tweet (or null when classified non-event). */
export function decideAlignments(
  tweets: readonly TweetEvent[],
  candidates: readonly AlignmentCandidate[],
  eventThreshold = 0.35,
): AlignmentDecision[] {
  return tweets.map((tweet) => {
    const mine = candidates.filter((c) => c.tweetId === tweet.id);
    const best = mine[0] ?? null;
    const maxBi = best?.biEncoderScore ?? 0;
    const cls = classifyTweet(tweet.text, maxBi, eventThreshold);
    if (cls !== "event" || best === null) {
      return {
        tweetId: tweet.id,
        class: cls,
        bestPlayId: null,
        score: maxBi,
      };
    }
    return {
      tweetId: tweet.id,
      class: "event",
      bestPlayId: best.playId,
      score: best.combinedScore,
    };
  });
}

/**
 * Aggregate per-drive narrative features from aligned event tweets.
 * Sentiment is a simple lexical scaffold (−1..+1); not a trained model.
 */
export function aggregateDriveSentiment(
  decisions: readonly AlignmentDecision[],
  tweets: readonly TweetEvent[],
  plays: readonly PlayEvent[],
): DriveSentimentFeature[] {
  const tweetById = new Map(tweets.map((t) => [t.id, t]));
  const playById = new Map(plays.map((p) => [p.playId, p]));
  const byDrive = new Map<
    string,
    { sentiments: number[]; strategy: number; total: number }
  >();

  for (const d of decisions) {
    const tweet = tweetById.get(d.tweetId);
    if (!tweet) {
      continue;
    }
    let driveId = "__unaligned__";
    if (d.bestPlayId !== null) {
      const play = playById.get(d.bestPlayId);
      if (play) {
        driveId = play.driveId;
      }
    }
    const bucket = byDrive.get(driveId) ?? {
      sentiments: [],
      strategy: 0,
      total: 0,
    };
    bucket.total += 1;
    if (d.class === "strategy_talk") {
      bucket.strategy += 1;
    }
    bucket.sentiments.push(lexicalSentiment(tweet.text));
    byDrive.set(driveId, bucket);
  }

  const features: DriveSentimentFeature[] = [];
  for (const [driveId, bucket] of byDrive) {
    const mean =
      bucket.sentiments.length === 0
        ? 0
        : bucket.sentiments.reduce((s, v) => s + v, 0) /
          bucket.sentiments.length;
    features.push({
      driveId,
      meanSentiment: mean,
      tweetCount: bucket.total,
      strategyTalkShare:
        bucket.total === 0 ? 0 : bucket.strategy / bucket.total,
    });
  }
  return features;
}

function lexicalSentiment(text: string): number {
  const lower = text.toLowerCase();
  const pos = ["great", "elite", "explosive", "dominant", "win", "score"];
  const neg = ["poor", "ugly", "turnover", "sack", "injury", "collapse"];
  let score = 0;
  for (const w of pos) {
    if (lower.includes(w)) {
      score += 1;
    }
  }
  for (const w of neg) {
    if (lower.includes(w)) {
      score -= 1;
    }
  }
  return Math.max(-1, Math.min(1, score / 3));
}

/**
 * Binary alignment F1 against gold (tweetId → playId | null).
 * null gold = no-event; predicted bestPlayId must match exactly.
 */
export function evaluateAlignmentF1(
  decisions: readonly AlignmentDecision[],
  gold: ReadonlyMap<string, string | null>,
): AlignmentEval {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const [tweetId, goldPlay] of gold) {
    const pred = decisions.find((d) => d.tweetId === tweetId);
    const predPlay =
      pred === undefined || pred.class !== "event" ? null : pred.bestPlayId;
    if (goldPlay === null && predPlay === null) {
      tp += 1;
    } else if (goldPlay !== null && predPlay === goldPlay) {
      tp += 1;
    } else if (predPlay !== null && goldPlay !== predPlay) {
      fp += 1;
      if (goldPlay !== null) {
        fn += 1;
      }
    } else if (predPlay === null && goldPlay !== null) {
      fn += 1;
    }
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return {
    f1,
    precision,
    recall,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
  };
}

/** Binary cross-entropy mean; scaffold for the OOS log-loss arm. */
export function meanLogLoss(
  probs: readonly number[],
  labels: readonly number[],
): number {
  if (probs.length === 0 || probs.length !== labels.length) {
    return Number.POSITIVE_INFINITY;
  }
  let sum = 0;
  for (let i = 0; i < probs.length; i += 1) {
    const y = labels[i] ?? 0;
    const p = Math.min(1 - 1e-9, Math.max(1e-9, probs[i] ?? 0.5));
    sum += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return sum / probs.length;
}

export function evaluateLogLossArm(
  baselineProbs: readonly number[],
  augmentedProbs: readonly number[],
  labels: readonly number[],
  tweetCount: number,
): LogLossArm {
  const baselineLogLoss = meanLogLoss(baselineProbs, labels);
  const augmentedLogLoss = meanLogLoss(augmentedProbs, labels);
  return {
    baselineLogLoss,
    augmentedLogLoss,
    delta: baselineLogLoss - augmentedLogLoss,
    tweetCount,
  };
}

/**
 * Dual acceptance gate from the ledger.
 * Log-loss arm requires tweetCount >= MIN_TWEETS_FOR_LOGLOSS_ARM.
 */
export function passesAcceptanceGate(
  alignment: AlignmentEval,
  logLoss: LogLossArm,
): AcceptanceGateResult {
  const alignmentPass = alignment.f1 >= ALIGNMENT_F1_FLOOR;
  const logLossPass =
    logLoss.tweetCount >= MIN_TWEETS_FOR_LOGLOSS_ARM &&
    logLoss.delta >= LOG_LOSS_DELTA_FLOOR;
  return {
    alignmentPass,
    logLossPass,
    adopt: alignmentPass && logLossPass,
    f1: alignment.f1,
    logLossDelta: logLoss.delta,
  };
}
