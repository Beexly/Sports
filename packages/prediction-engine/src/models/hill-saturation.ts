/**
 * Hill saturation with slope fixed at 1.
 *
 * Prior art, not copied code: MatheusRabetti/mmm-pymc has no licence file.
 * Its saturation module states hill(spend, k) = spend / (spend + k), and
 * hill(k, k) = 0.5. k is the half-saturation point.
 */

export function hillSaturation(spend: number, halfSaturation: number): number {
  if (!Number.isFinite(spend) || spend < 0) {
    throw new Error("spend must be a finite non-negative number");
  }
  if (!Number.isFinite(halfSaturation) || halfSaturation <= 0) {
    throw new Error("half-saturation k must be finite and positive");
  }
  return spend / (spend + halfSaturation);
}
