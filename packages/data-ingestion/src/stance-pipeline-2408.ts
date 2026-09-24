/**
 * Few-shot topic/stance pipeline for the signal desk (NFL injury/trade storylines)
 *
 * Research port: arXiv:2408.02520
 * Normalized lane: nlp | Doctrine: SITUATIONAL
 *
 * Adapts the few-shot topic/stance pipeline into the signal desk for NFL injury/trade storylines, upgraded with retrieval-augmented few-shot: the 3 most similar labeled tweets from a growing GSE gold bank as in-context examples. Similarity retrieval + prompt assembly; labeling stays human-owned.
 *
 * ACCEPTANCE GATE: ADAPT into the signal desk only if the pilot clears 70% stance accuracy with per-class F1 >= 0.55 on the minority class for NFL injury/trade storylines. Signal-desk only; never gates a pick.
 */

export type Stance = "supports" | "refutes" | "neutral";

export interface LabeledTweet {
  id: string;
  text: string;
  topic: string;
  stance: Stance;
  /** precomputed embedding */
  embedding: number[];
}

export interface UnlabeledTweet {
  id: string;
  text: string;
  embedding: number[];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Retrieve the k most similar labeled tweets (in-context examples). */
export function retrieveFewShot(
  tweet: UnlabeledTweet,
  goldBank: LabeledTweet[],
  k = 3,
): LabeledTweet[] {
  return [...goldBank]
    .map((g) => ({ g, s: cosine(tweet.embedding, g.embedding) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.g);
}

export interface StancePrompt {
  tweetId: string;
  topic: string;
  examples: { text: string; stance: Stance }[];
  target: string;
}

/** Assemble the retrieval-augmented few-shot prompt. */
export function buildStancePrompt(tweet: UnlabeledTweet, topic: string, examples: LabeledTweet[]): StancePrompt {
  return {
    tweetId: tweet.id,
    topic,
    examples: examples.map((e) => ({ text: e.text, stance: e.stance })),
    target: tweet.text,
  };
}

/** Per-class F1 from a confusion list (for the minority-class gate). */
export function perClassF1(truth: Stance[], pred: Stance[], cls: Stance): number {
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < truth.length; i++) {
    if (pred[i] === cls && truth[i] === cls) tp++;
    else if (pred[i] === cls) fp++;
    else if (truth[i] === cls) fn++;
  }
  const denom = 2 * tp + fp + fn;
  return denom === 0 ? 0 : (2 * tp) / denom;
}


/** Live-data gate: stays off until stance pipeline validated on NFL discourse. */
export const GSE_STANCE_PIPELINE_ENABLED = false;
