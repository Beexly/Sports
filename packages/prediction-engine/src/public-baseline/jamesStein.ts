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
