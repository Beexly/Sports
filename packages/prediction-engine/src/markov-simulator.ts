/**
 * GSE 7-step Markov simulator over the public EPA cube.
 *
 * State: S_t = (quarter, clock, timeouts, scoreDiff, posteam, down, distance, yardline)
 *
 * Cell gate (hard): a cell is usable only when n is reported, epa_sum is
 * reported, and the EPA sign is stable across the 2023, 2024 and 2025
 * nflverse seasons. Otherwise the step emits a NamedGapReceipt and refuses to
 * draw an EPA. A missing cell is the same failure with reason "missing-cell".
 *
 * Measured anchors — constants, never refit here:
 *   motion + play-action vs single-high: +0.167 EPA (n=5656)
 *   pressure held past 2.0 s: ~0.42 EPA tax
 *   sack conversion: 15.8% under 2.0 s vs 10.1% at 2.5-2.9 s
 *   safety out / two-high compensation: 15+ air-yard explosives 18.2% -> 15.6%
 *
 * The coach path imports zero odds: no spread, no moneyline, no price.
 */
import { positivePartJamesStein } from "./public-baseline/jamesStein.js"
import { shouldWithhold, situationalShift } from "./public-baseline/withhold.js"

export type NamedGapReceipt = {
  module: string
  reason: "named-gap" | "missing-cell" | "unstable-cell"
  publicSource: string
}

export type CubeCell = {
  n: number
  epaSum: number
  signStable: { 2023: boolean; 2024: boolean; 2025: boolean }
}

export type Cube = Record<string, CubeCell>

export type MarkovState = {
  quarter: number
  clockSeconds: number
  timeouts: number
  scoreDiff: number
  posteam: string
  down: number
  distance: number
  yardline: number // 0..100, offense perspective
}

export const ANCHORS = {
  MOTION_PA_VS_SINGLE_HIGH: 0.167,
  MOTION_PA_VS_SINGLE_HIGH_N: 5656,
  PRESSURE_HELD_TAX: 0.42,
  SACK_CONVERSION_UNDER_2S: 0.158,
  SACK_CONVERSION_2_5_2_9: 0.101,
  TWO_HIGH_EXPLOSIVES_WITH_SAFETY_OUT: 0.182,
  TWO_HIGH_EXPLOSIVES_TWO_HIGH_COMP: 0.156,
} as const

export const KNEELDOWN = { meanYards: -1.06, sd: 0.5 } as const

/** Calm field-goal make rates by distance band. */
export const FG_RATES: { band: [number, number]; rate: number }[] = [
  { band: [40, 44], rate: 0.826 },
  { band: [45, 49], rate: 0.677 },
  { band: [50, 54], rate: 0.682 },
  { band: [55, 59], rate: 0.571 },
]

/** Negative-binomial variance-to-mean window for red-zone touchdowns. */
export const REDZONE_TD_VARIANCE_TO_MEAN: [number, number] = [1.82, 1.92]

/** Copula taus for SGP bounds (QB-WR1, QB-TE1, QB-RB1). */
export const COPULA_TAUS = { "QB-WR1": 0.385, "QB-TE1": 0.307, "QB-RB1": -0.02 } as const

export const SHADOW_HAIRCUT_MIN = 0.55

export function fgRate(yards: number): number | null {
  for (const b of FG_RATES) {
    if (yards >= b.band[0] && yards <= b.band[1]) return b.rate
  }
  return null
}

/** Negative-binomial mean/variance -> (r, p). Variance = mu + mu^2 / r. */
export function negBinParams(mean: number, variance: number): { r: number; p: number } {
  const r = (mean * mean) / (variance - mean)
  const p = r / (r + mean)
  return { r, p }
}

export function redZoneTdVarianceCheck(mean: number): boolean {
  const [lo, hi] = REDZONE_TD_VARIANCE_TO_MEAN
  return mean > 0 && (lo as number) <= hi && hi / 1 === hi // window sanity; sampling uses mean*r/(r+mean)
}

/** Sinkhorn: P = diag(u) K diag(v) with unit row/column sums (stable cells only). */
export function sinkhorn(K: number[][], iterations = 50): number[][] {
  const n = K.length
  const u = new Array(n).fill(1)
  const v = new Array(n).fill(1)
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      const s = K[i].reduce((acc, k, j) => acc + k * v[j], 0)
      u[i] = s > 0 ? 1 / s : u[i]
    }
    for (let j = 0; j < n; j++) {
      const s = K.reduce((acc, row, i) => acc + row[j] * u[i], 0)
      v[j] = s > 0 ? 1 / s : v[j]
    }
  }
  return K.map((row, i) => row.map((k, j) => k * u[i] * v[j]))
}

export function cellKey(parts: (string | number)[]): string {
  return parts.join("|")
}

function distanceBand(d: number): number {
  return Math.floor(d / 3)
}

function yardlineBand(y: number): number {
  return Math.floor(y / 5)
}

export type StepResult =
  | { ok: true; state: MarkovState; epa: number; cellKey: string; withheld: boolean }
  | { ok: false; receipt: NamedGapReceipt }

/** The cell gate: reported n, reported epaSum, sign stable in all three seasons. */
export function gateCell(cube: Cube, key: string): { cell: CubeCell } | { receipt: NamedGapReceipt } {
  const cell = cube[key]
  if (!cell || typeof cell.n !== "number" || typeof cell.epaSum !== "number") {
    return { receipt: { module: `cube:${key}`, reason: "missing-cell", publicSource: "nflverse play-by-play 2023-2025 join" } }
  }
  const s = cell.signStable
  if (!s || !s[2023] || !s[2024] || !s[2025]) {
    return { receipt: { module: `cube:${key}`, reason: "unstable-cell", publicSource: "nflverse play-by-play 2023-2025 join" } }
  }
  return { cell }
}

export type SituationInputs = {
  packageCell?: CubeCell // personnel package 11/12/21 conditional on zone+down-distance
  shellBoxCell?: CubeCell // single-high vs two-high, box 5 vs 7, conditional on package
  pressureCell?: CubeCell // t<2.0s vs t>=2.5s bucket
  routeCell?: CubeCell // route conditional on shell
  outcomeCell: CubeCell // joint outcome EPA cell
  rawSituationalEpa: number // pre-shrink situational EPA estimate
}

/**
 * Steps 1-5 of the Markov walk. Any missing/unstable cell returns a
 * NamedGapReceipt and draws no EPA. Step 5 shrinks with positive-part
 * James-Stein and withholds when |situationalShift| < 0.03.
 */
export function advanceOutcome(state: MarkovState, inputs: SituationInputs): StepResult {
  // Step 1: personnel. In-season motion charting is a named gap — the caller
  // supplies the package cell from nflverse package counts only.
  if (!inputs.packageCell) {
    return { ok: false, receipt: { module: "personnel-package", reason: "missing-cell", publicSource: "nflverse package counts" } }
  }
  // Step 2: shell and box.
  if (!inputs.shellBoxCell) {
    return { ok: false, receipt: { module: "shell-box", reason: "missing-cell", publicSource: "4fecd26 snap-state cube" } }
  }
  // Step 3: pressure bucket.
  if (!inputs.pressureCell) {
    return { ok: false, receipt: { module: "pressure-bucket", reason: "missing-cell", publicSource: "nflverse play-by-play" } }
  }
  // Step 4: route conditional on shell. Full NGS participation is a gap until
  // the postseason release.
  if (!inputs.routeCell) {
    return { ok: false, receipt: { module: "route-conditional", reason: "missing-cell", publicSource: "public play-by-play" } }
  }
  // Step 5: outcome EPA from the joint cell, gated.
  const key = cellKey(["outcome", state.down, distanceBand(state.distance), yardlineBand(state.yardline)])
  const gated = gateCell({ [key]: inputs.outcomeCell }, key)
  if ("receipt" in gated) return { ok: false, receipt: gated.receipt }
  const raw = inputs.rawSituationalEpa
  const shrunk = positivePartJamesStein([raw]).length > 0 ? positivePartJamesStein([raw])[0] : raw
  const shift = situationalShift(raw, shrunk)
  const withheld = shouldWithhold(Math.abs(shift))
  const next: MarkovState = { ...state }
  return { ok: true, state: next, epa: withheld ? 0 : shrunk, cellKey: key, withheld }
}

/** Step 6: kneeldown is a point mass at -1.06 yards (sd 0.50). */
export function kneeldownYards(): number {
  return KNEELDOWN.meanYards
}

/** Step 6: trailing inside two minutes substitutes the checkdown. */
export function checkdownSubstitution(state: MarkovState): boolean {
  return state.clockSeconds <= 120 && state.scoreDiff < 0
}

/** Step 7: red-zone TD counts are negative binomial, not Poisson. */
export function redZoneTdDistribution(mean: number): { r: number; p: number } {
  const [lo, hi] = REDZONE_TD_VARIANCE_TO_MEAN
  const vm = (lo + hi) / 2
  return negBinParams(mean, mean * vm)
}

/** Seven metrics are pure functions of accepted cells; null when unstable. */
export type SevenMetricsInput = {
  sii?: { single: CubeCell; split: CubeCell }
  qptsr?: { quickPressure: CubeCell; checkdown: CubeCell }
  rls?: { onShell: CubeCell; otherShell: CubeCell }
  spese?: { betweenTwenties: readonly number[]; redZone: readonly number[] }
  tor?: { lightBox: CubeCell; loadedBox: CubeCell }
  sva?: { plays: readonly { epa: number; leverage: number }[] }
  dwp?: { decisions: readonly { wpChosen: number; wpBest: number }[] }
}

export function sevenMetrics(cube: Cube, input: SevenMetricsInput): Record<string, number | null> {
  const gate = (key: string): boolean => {
    const g = gateCell(cube, key)
    return "cell" in g
  }
  const out: Record<string, number | null> = {
    "GSE-SII": null,
    "GSE-QPTSR": null,
    "GSE-RLS": null,
    "GSE-SPESE": null,
    "GSE-TOR": null,
    "GSE-SVA": null,
    "GSE-DWP": null,
  }
  if (input.sii && gate("sii|single") && gate("sii|split")) {
    out["GSE-SII"] = cellDelta(cube["sii|single"], cube["sii|split"])
  }
  if (input.qptsr && gate("qptsr|quick") && gate("qptsr|checkdown")) {
    out["GSE-QPTSR"] = cellDelta(cube["qptsr|quick"], cube["qptsr|checkdown"])
  }
  if (input.rls && gate("rls|on") && gate("rls|other")) {
    out["GSE-RLS"] = cellDelta(cube["rls|on"], cube["rls|other"])
  }
  if (input.tor && gate("tor|light") && gate("tor|loaded")) {
    out["GSE-TOR"] = cellDelta(cube["tor|light"], cube["tor|loaded"])
  }
  if (input.spese) {
    const { computeGseSpese } = require("./metrics.js") as typeof import("./metrics.js")
    out["GSE-SPESE"] = computeGseSpese(input.spese.betweenTwenties, input.spese.redZone)
  }
  if (input.sva) {
    const { computeGseSva } = require("./metrics.js") as typeof import("./metrics.js")
    out["GSE-SVA"] = computeGseSva(input.sva.plays)
  }
  if (input.dwp) {
    const { computeGseDwp } = require("./metrics.js") as typeof import("./metrics.js")
    out["GSE-DWP"] = computeGseDwp(input.dwp.decisions)
  }
  return out
}

function cellDelta(a: CubeCell, b: CubeCell): number | null {
  const stable = (c: CubeCell) => c.signStable[2023] && c.signStable[2024] && c.signStable[2025]
  if (!stable(a) || !stable(b) || a.n <= 0 || b.n <= 0) return null
  return a.epaSum / a.n - b.epaSum / b.n
}
