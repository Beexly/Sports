/**
 * Elo update printed as eq (2) in Holy and Cerny, arXiv:2604.09143v1
 * page https://arxiv.org/html/2604.09143v1 (Section 2, The Elo Rating System):
 *   rA' = rA + 16 * (yA - 1 / (1 + 10^(-(rA-rB)/400)))
 *   rB' = rB + 16 * (yB - 1 / (1 + 10^((rA-rB)/400)))
 * K-factor 16 and scale 400 are the printed constants, not fitted.
 * Fail closed when ratings or the win/loss pair are not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function scoreDrivenEloUpdate(ratingA, ratingB, yA, yB) {
  if (typeof ratingA !== "number" || !Number.isFinite(ratingA)) {
    return { ok: false, reason: "non_finite_rating_a" };
  }
  if (typeof ratingB !== "number" || !Number.isFinite(ratingB)) {
    return { ok: false, reason: "non_finite_rating_b" };
  }
  const winLoss =
    (yA === 1 && yB === 0) || (yA === 0 && yB === 1);
  if (!winLoss) {
    return { ok: false, reason: "outcome_not_win_loss_pair" };
  }
  const expectedA = 1 / (1 + 10 ** (-(ratingA - ratingB) / 400));
  const expectedB = 1 / (1 + 10 ** ((ratingA - ratingB) / 400));
  if (!Number.isFinite(expectedA) || !Number.isFinite(expectedB)) {
    return { ok: false, reason: "non_finite_expected" };
  }
  const nextA = ratingA + 16 * (yA - expectedA);
  const nextB = ratingB + 16 * (yB - expectedB);
  if (!Number.isFinite(nextA) || !Number.isFinite(nextB)) {
    return { ok: false, reason: "non_finite_update" };
  }
  return { ok: true, nextA, nextB, expectedA, expectedB, k: 16 };
}
