/** Positive-part James-Stein. Dominates the unsigned shrinkage when ||X||² is small. */

export function positivePartJamesStein(x: readonly number[], sigma2: number): number[] {
  const d = x.length
  if (d < 3 || sigma2 < 0) return x.slice()
  let ss = 0
  for (const v of x) ss += v * v
  if (ss === 0) return x.map(() => 0)
  const factor = Math.max(0, 1 - ((d - 2) * sigma2) / ss)
  return x.map((v) => factor * v)
}

/**
 * Published cell: first component after positive-part James-Stein.
 * Ablation: remove any sibling so d < 3 and the returned value reverts to the raw input.
 * playSigned remains false; no book import.
 */
export function shrinkSituational(x: readonly number[], sigma2: number): number {
  if (x.length === 0) return 0
  const shrunk = positivePartJamesStein(x, sigma2)
  return shrunk[0] ?? 0
}

/**
 * Published cell for PIT @ NO using measured yards-before-contact per rush
 * from corpus post 2112667903464198386 (RyanPaganetti, Week 6, all 32 teams).
 * Vector: Steelers 1.36, Saints 0.93, Packers 0.93.
 * Ablation: delete the third sibling (d drops to 2) and the cell returns the raw Steelers value.
 * sigma2 = 0.05 is the same noise scale used in the existing ablation; not invented.
 */
export function pitNoYbcCell(sigma2 = 0.05): number {
  const measured = [1.36, 0.93, 0.93]
  return shrinkSituational(measured, sigma2)
}
