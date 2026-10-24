/** Frozen-slice veto is dead once the measured shift clears this. Quiet shifts still withhold. */

export const SHIFT_FLOOR = 0.03

/**
 * Mean of lean × freshness × trust, plus one rest term (days × 0.025).
 * Rest is not averaged away. Seven days is +0.175 on top of the mean product.
 */
export function situationalShift(
  obs: readonly { lean: number; freshness?: number; trust?: number }[],
  restDays = 0,
): number {
  const rest = restDays * 0.025
  if (obs.length === 0) return rest
  let sum = 0
  for (const o of obs) sum += o.lean * (o.freshness ?? 1) * (o.trust ?? 1)
  return sum / obs.length + rest
}

export function shouldWithhold(shift: number): boolean {
  return Math.abs(shift) < SHIFT_FLOOR
}
