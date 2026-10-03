/**
 * Edge Index shown to a viewer.
 *
 * Edge Index is the free trust signal: the market-relative heuristic of a
 * book-priced pick (scoring.ts computeEdgeScore), public to every tier. A
 * signal-slate row has no book behind it (bookmakerCount 0); its edgeScore is
 * round((trueProb - 0.5) * 100), and its confidence is round(trueProb * 100),
 * so edgeScore = confidence - 50 exactly. Serving that number to a viewer who
 * cannot see confidence hands them the gated number with one subtraction
 * (live anonymous payload on 2026-09-05: edgeScore 18, teaser "68%"). An
 * "edge" without a book line is not an edge index, so it is withheld from
 * viewers who cannot see confidence. Book-priced rows are unaffected.
 */
export function publicEdgeScore(
  pick: { readonly edgeScore: number | null; readonly bookmakerCount: number },
  viewer: { readonly canSeeEdgeScore: boolean; readonly canSeeConfidence: boolean },
): number | null {
  if (!viewer.canSeeEdgeScore) return null;
  if (!viewer.canSeeConfidence && pick.bookmakerCount <= 0) return null;
  return pick.edgeScore;
}
