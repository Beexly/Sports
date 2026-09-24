/**
 * arXiv 1310.6998v1: Predicting the NFL using Twitter
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Social-volume signal infrastructure: per-team weekly post-volume momentum
features (rateP-style EWMA with locked theta=0.2, z-scored) for the totals
model, plus a beat-writer injury-news sentiment lane scored against a small
injury lexicon. Hyperparameters are fixed before evaluation; the unigram/CCA
pipeline from the paper is rejected outright.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * As text-signal infrastructure for predicting the NFL, add per-team weekly X/Twitter post-volume momentum features (rateP-style, locked theta=0.2) to the totals model -- the paper's strongest claim -- plus a separate finetuned beat-writer injury-news sentiment embedding family, with all hyperparameters fixed on 2023-2024 and evaluated locked on 2025 with no oracle conjunctions, reported against the 53% WTS bar with CIs.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt tweet-volume momentum as a totals-model feature if the locked 2025 online test shows >=3pp O/U accuracy gain over the stats baseline with CI excluding zero; adopt the injury-news sentiment lane only if a beat-writer sentiment feature adds >=2pp WTS accuracy over volume alone; reject the unigram/CCA pipeline entirely.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: markets | verdict: ADAPT | doctrine: BASELINE
 */
export const ENABLED = false; // Gate needs locked 2025 evaluation vs stats baseline.

/** rateP-style EWMA with locked theta = 0.2. */
export function ewma(values: number[], theta = 0.2): number[] {
  const out: number[] = [];
  let m = values[0] ?? 0;
  for (const v of values) {
    m = theta * v + (1 - theta) * m;
    out.push(m);
  }
  return out;
}

/** Per-team weekly volume momentum: z-scored EWMA of post volumes. */
export function volumeMomentumFeature(weeklyVolumes: number[], theta = 0.2): number[] {
  const m = ewma(weeklyVolumes, theta);
  const mean = m.reduce((a, b) => a + b, 0) / m.length;
  const sd = Math.sqrt(m.reduce((a, b) => a + (b - mean) ** 2, 0) / m.length) || 1;
  return m.map((x) => (x - mean) / sd);
}

const POSITIVE = [
  "cleared",
  "returning",
  "practicing",
  "optimistic",
  "hopeful",
  "progressing",
  "upgrade",
  "full participant",
  "good to go",
];
const NEGATIVE = [
  "doubtful",
  "questionable",
  "surgery",
  "setback",
  "injured reserve",
  "did not practice",
  "limited",
  "downgrade",
  "re-injured",
  "injured",
  "injury",
  "dnp",
];

/**
 * Beat-writer injury-news sentiment in [-1, 1] from a fixed injury lexicon.
 * (pos - neg) / (pos + neg + 1). Heuristic only, not a finetuned embedding.
 */
export function beatWriterSentiment(headlines: string[]): number {
  let pos = 0;
  let neg = 0;
  for (const h of headlines) {
    const t = h.toLowerCase();
    for (const w of POSITIVE) if (t.includes(w)) pos++;
    for (const w of NEGATIVE) if (t.includes(w)) neg++;
  }
  return (pos - neg) / (pos + neg + 1);
}

export interface TotalsFeatures {
  volumeMomentum: number;
  injurySentiment: number;
}

/** Combined totals-model feature row per team-week. */
export function totalsModelFeatures(
  weeklyVolumes: number[],
  headlines: string[][],
  theta = 0.2,
): TotalsFeatures[] {
  const mom = volumeMomentumFeature(weeklyVolumes, theta);
  return mom.map((volumeMomentum, i) => ({
    volumeMomentum,
    injurySentiment: beatWriterSentiment(headlines[i] ?? []),
  }));
}
