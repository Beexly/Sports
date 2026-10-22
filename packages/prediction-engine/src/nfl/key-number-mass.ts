/**
 * NFL key-number mass.
 *
 * Source opened: ryanpmcintire/nfl_py3 src/nfl_ats/key_numbers.py (MIT).
 * Their default keys are 1, 2, 3, 4, 6, 7, 10, 14. Mass for k is the share
 * of margins whose rounded value is k or -k. Their pandas wrapper was not copied.
 */

export const NFL_KEY_NUMBERS = [1, 2, 3, 4, 6, 7, 10, 14] as const;

export function keyNumberMass(
  margins: readonly number[],
  keys: readonly number[] = NFL_KEY_NUMBERS,
): Record<number, number> {
  if (keys.length === 0) throw new Error("at least one key number is required");
  if (margins.length === 0) throw new Error("at least one margin is required");
  if (margins.some((m) => !Number.isFinite(m))) throw new Error("margins must be finite");
  const out: Record<number, number> = {};
  for (const k of keys) {
    const hits = margins.filter((m) => Math.abs(Math.round(m)) === k).length;
    out[k] = hits / margins.length;
  }
  return out;
}
