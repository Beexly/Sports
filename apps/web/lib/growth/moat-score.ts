/**
 * moat-score.ts — R3 Uniqueness / Moat velocity.
 *
 * HARD LAW: this score is a LEAD-TIME indicator only. It measures how far ahead
 * GSE currently is on a handful of observable signals (labeled shadow data,
 * public-packet publishing cadence, SDK adoption, receipt-verify activity,
 * governed-surface breadth, and cutoff-matrix N*). It is NOT a claim of
 * permanent or defensible uniqueness, and it must never be presented as one —
 * anywhere: docs, decks, packets, marketing copy. Competitors can and will
 * close any of these gaps; this number says nothing about durability, only
 * about current velocity/lead. Do not attach words like "permanent",
 * "unassailable", "defensible moat", or "unprecedented" to this metric.
 */
export type MoatInputs = {
  labeledShadowN: number;
  publicPacketStreakWeeks: number;
  sdkStars: number;
  uniqueReceiptVerifies7d: number;
  distinctSurfacesGoverned: number;
  cutoffNStar: number;
};

export function moatScore(m: MoatInputs): number {
  return (
    Math.log(1 + m.labeledShadowN) * 3 +
    m.publicPacketStreakWeeks * 2 +
    Math.log(1 + m.sdkStars) * 2 +
    Math.log(1 + m.uniqueReceiptVerifies7d) * 3 +
    m.distinctSurfacesGoverned * 2 +
    Math.log(1 + m.cutoffNStar)
  );
}
