/** Seven GSE metrics as pure functions over counted cells. No season-average fallback. */

export type Cell = { n: number; epaSum: number; signStable: boolean }

export const ANCHOR_MOTION_PA_SINGLE = { epa: 0.167, n: 5656 } as const
export const ANCHOR_PRESSURE_HELD_TAX = 0.42

export function cellEpa(cell: Cell): number | null {
  if (cell.n <= 0 || !cell.signStable) return null
  return cell.epaSum / cell.n
}

function gap(a: Cell, b: Cell): number | null {
  const left = cellEpa(a)
  const right = cellEpa(b)
  if (left == null || right == null) return null
  return left - right
}

/** ΔEPA of motion+play-action, single-high minus split-safety. */
export function computeGseSii(single: Cell, split: Cell): number | null {
  return gap(single, split)
}

/** Quick-pressure EPA minus the checkdown residual. */
export function computeGseQptsr(quickPressure: Cell, checkdown: Cell): number | null {
  return gap(quickPressure, checkdown)
}

/** Route EPA on the called shell minus the other shell. */
export function computeGseRls(onShell: Cell, otherShell: Cell): number | null {
  return gap(onShell, otherShell)
}

export function shannonBits(probs: readonly number[]): number | null {
  let mass = 0
  for (const p of probs) {
    if (p < 0) return null
    mass += p
  }
  if (mass <= 0) return null
  let h = 0
  for (const p of probs) {
    if (p === 0) continue
    const q = p / mass
    h -= q * Math.log2(q)
  }
  return h
}

/** Between-the-20s entropy minus red-zone entropy, in bits. */
export function computeGseSpese(betweenTwenties: readonly number[], redZone: readonly number[]): number | null {
  const a = shannonBits(betweenTwenties)
  const b = shannonBits(redZone)
  if (a == null || b == null) return null
  return a - b
}

/** Light-box EPA minus loaded-box EPA. */
export function computeGseTor(lightBox: Cell, loadedBox: Cell): number | null {
  return gap(lightBox, loadedBox)
}

/** Leverage-weighted EPA. Negative leverage is a bad cell, not a sign flip. */
export function computeGseSva(plays: readonly { epa: number; leverage: number }[]): number | null {
  if (plays.length === 0) return null
  let num = 0
  let den = 0
  for (const play of plays) {
    if (!(play.leverage >= 0)) return null
    num += play.epa * play.leverage
    den += play.leverage
  }
  if (den === 0) return null
  return num / den
}

/** Mean win-probability bleed: chosen decision minus the best available. */
export function computeGseDwp(decisions: readonly { wpChosen: number; wpBest: number }[]): number | null {
  if (decisions.length === 0) return null
  let sum = 0
  for (const d of decisions) sum += d.wpChosen - d.wpBest
  return sum / decisions.length
}
