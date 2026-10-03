/**
 * Simulation Cloud geometry — pure math for rendering the market's spread of
 * belief as REAL samples (one dot per book's no-vig P(home)).
 *
 * Honesty rules:
 *   - null under 2 samples — a cloud of one is a point wearing a costume
 *   - the axis domain is zoomed to the data but its endpoints are LABELED,
 *     so zoom never becomes a visual lie
 *   - the consensus tick always sits inside the rendered domain
 */

export interface CloudDot {
  readonly prob: number;
  /** Horizontal position within the rendered domain, 0..100. */
  readonly leftPct: number;
}

export interface CloudGeometry {
  /** Rendered domain start/end as probabilities (0..1) — label these. */
  readonly loProb: number;
  readonly hiProb: number;
  /** Book disagreement: (max − min) sample, in percentage points, 1dp. */
  readonly spreadPp: number;
  readonly dots: readonly CloudDot[];
  readonly consensusLeftPct: number;
}

const PAD = 0.02; // 2pp breathing room past the extreme samples
const MIN_SPAN = 0.06; // tight clouds stay readable without faking dispersion

export function cloudGeometry(
  probs: readonly number[],
  consensus: number,
): CloudGeometry | null {
  const samples = probs.filter((p) => Number.isFinite(p) && p > 0 && p < 1);
  if (samples.length < 2 || !Number.isFinite(consensus)) return null;

  const min = Math.min(...samples);
  const max = Math.max(...samples);

  let lo = Math.min(min, consensus) - PAD;
  let hi = Math.max(max, consensus) + PAD;
  if (hi - lo < MIN_SPAN) {
    const center = (hi + lo) / 2;
    lo = center - MIN_SPAN / 2;
    hi = center + MIN_SPAN / 2;
  }
  lo = Math.max(0, lo);
  hi = Math.min(1, hi);
  const span = hi - lo;
  if (span <= 0) return null;

  const place = (p: number) =>
    Number((((Math.min(Math.max(p, lo), hi) - lo) / span) * 100).toFixed(1));

  return {
    loProb: lo,
    hiProb: hi,
    spreadPp: Number(((max - min) * 100).toFixed(1)),
    dots: samples.map((p) => ({ prob: p, leftPct: place(p) })),
    consensusLeftPct: place(consensus),
  };
}

/** Disagreement wide enough to be the story rather than noise. */
export const WIDE_SPREAD_PP = 4;
